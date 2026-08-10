import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedTender } from "./firecrawlExtract";

// Shared by every insert path (search-query, fixed-source, uploaded-website): `tenders.closing_date`
// is NOT NULL in the DB, but extraction often can't find a date. Status is computed from the raw
// extracted value (missing ⇒ open) before falling back to a far-future sentinel for storage, so an
// unknown deadline never reads as already-closed.
const NO_DEADLINE_SENTINEL = "9999-12-31";

export interface TenderRow {
  title: string;
  description: string | null;
  closing_date: string;
  source_url: string;
  status: "open" | "closed";
  tender_type: string;
  format: string;
  scraped_at: string;
  organization: string | null;
  category: string | null;
  location: string | null;
  budget: number | null;
  document_url: string | null;
  raw_content: string | null;
  job_id: string | null;
}

/** `tenders.location` is varchar(100); `budget` is numeric — guard both against malformed
 * extraction output before it hits the DB. */
export function resolveOptionalFields(t: ExtractedTender): Pick<TenderRow, "organization" | "category" | "location" | "budget" | "document_url"> {
  return {
    organization: t.organization?.trim() || null,
    category: t.category?.trim() || null,
    location: t.location?.trim().slice(0, 100) || null,
    // The model defaults unstated numbers to 0 rather than omitting the field — treat 0 as
    // "not provided" too, since a genuine $0 tender is not a real case worth distinguishing.
    budget: typeof t.budget === "number" && isFinite(t.budget) && t.budget > 0 ? t.budget : null,
    document_url: t.document_url?.trim() || null,
  };
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * `tenders.source_url` is UNIQUE — with multiple scrape flows able to extract the same tender
 * from overlapping sources, a plain insert races: two jobs can both pass a "does it already
 * exist" check before either has committed, and the second insert throws a duplicate-key error.
 * Upsert-and-ignore sidesteps the race entirely (and drops the need to pre-fetch every existing
 * source_url on every batch).
 *
 * Also filters out near-duplicates — the same tender re-listed under a different URL on another
 * aggregator — by normalized title + closing_date, since source_url uniqueness alone doesn't
 * catch that case.
 */
export interface InsertedTenderSummary {
  id: number;
  title: string;
  closing_date: string;
  status: "open" | "closed";
  organization: string | null;
  location: string | null;
  category: string | null;
}

export interface InsertResult {
  inserted: number;
  open: number;
  closed: number;
  /** Enough per-tender detail to build a Slack/email summary (with real deep links) without a second query. */
  rows: InsertedTenderSummary[];
}

// Callers previously computed open/closed counts themselves from the pre-filter row list, which
// silently drifted from reality once near-duplicate filtering could drop rows here — the returned
// counts are now always derived from what was actually attempted post-filter.
export async function insertTenderRows(supabase: SupabaseClient, rows: TenderRow[]): Promise<InsertResult> {
  if (rows.length === 0) return { inserted: 0, open: 0, closed: 0, rows: [] };

  const seen = new Set<string>();
  let deduped = rows.filter((r) => (seen.has(r.source_url) ? false : (seen.add(r.source_url), true)));

  const closingDates = [...new Set(deduped.map((r) => r.closing_date))];
  const { data: existing } = await supabase.from("tenders").select("title, closing_date").in("closing_date", closingDates);
  const existingKeys = new Set((existing || []).map((e: any) => `${normalizeTitle(e.title)}|${e.closing_date}`));
  deduped = deduped.filter((r) => !existingKeys.has(`${normalizeTitle(r.title)}|${r.closing_date}`));

  if (deduped.length === 0) return { inserted: 0, open: 0, closed: 0, rows: [] };

  // `ignoreDuplicates` means Postgres's ON CONFLICT DO NOTHING skips already-existing rows
  // silently — RETURNING (what `.select()` pulls back) only ever contains the rows that were
  // actually newly inserted, which is exactly what a "N new tenders found" notification wants.
  const { data: insertedRows, error } = await supabase
    .from("tenders")
    .upsert(deduped, { onConflict: "source_url", ignoreDuplicates: true })
    .select("id, title, closing_date, status, organization, location, category");
  if (error) throw error;

  const returned = insertedRows ?? [];
  return {
    inserted: returned.length,
    open: returned.filter((r) => r.status === "open").length,
    closed: returned.filter((r) => r.status === "closed").length,
    rows: returned.map((r) => ({
      id: r.id,
      title: r.title,
      closing_date: r.closing_date,
      status: r.status,
      organization: r.organization,
      location: r.location,
      category: r.category,
    })),
  };
}

/** "DMY" (day-first, e.g. GHANEPS's 28/08/2026) or "MDY" (month-first, e.g. Kenya Treasury's
 * 08/06/2026) — set on a SourceConfig when a source's slash-dates are known ahead of time.
 * Only disambiguates the genuinely-ambiguous case (both segments ≤12); an unambiguous segment
 * (>12) is always the day regardless of this hint, and dashes always parse day-first regardless
 * (see parseFlexibleDate). Defaults to "MDY" — JS Date's own native assumption — when omitted,
 * so existing sources with no hint set keep their prior behavior unchanged. */
export type DateFormatHint = "DMY" | "MDY";

// Despite the extraction schema asking for ISO 8601, some sources come back with a date `new
// Date()` can't parse directly (or worse, parses wrong):
// - Kenya Treasury wraps it in extra text ("Thu, 08/06/2026 - 15:00" — Date chokes on the
//   " - 15:00" suffix, not the date itself) and uses MM/DD/YYYY slashes (US convention).
// - PPIP uses ordinal day suffixes ("August 11th, 2026" — Date chokes on "th").
// - Job in Rwanda uses day-first dashes ("21-08-2026", "10-08-2026") — Date assumes
//   month-first for dash dates, so "10-08-2026" silently parses as October 8 instead of the
//   intended August 10.
// - GHANEPS (Ghana) uses DD/MM/YYYY slashes ("28/08/2026 14:00:00") — the *same* separator as
//   Treasury but the *opposite* day/month order, so a fixed "slash = MM/DD" assumption can't
//   handle both. Resolved case-by-case: whenever one of the two segments is >12 it can only be
//   the day regardless of convention (no source uses genuinely month-first slashes past the
//   12th); when both are ≤12 it's genuinely ambiguous from the text alone, so that's where the
//   caller's `DateFormatHint` (from the source's own SourceConfig) breaks the tie instead of a
//   blind default.
// A wrong date is worse than a missing one, so all of this runs before the ambiguous native
// parse. Shared by resolveClosingDate and computeStatus so both treat the same raw value
// consistently instead of one parsing it and the other giving up.
const DAY_FIRST_DASH_PATTERN = /(\d{1,2})-(\d{1,2})-(\d{4})/;
const SLASH_DATE_PATTERN = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const ORDINAL_SUFFIX_PATTERN = /(\d+)(st|nd|rd|th)\b/gi;
const DATE_SUBSTRING_PATTERN = /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/;

function tryDayFirst(day: string, month: string, year: string): Date | null {
  if (Number(day) > 31 || Number(month) > 12) return null;
  const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function tryMonthFirst(month: string, day: string, year: string): Date | null {
  if (Number(day) > 31 || Number(month) > 12) return null;
  const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseFlexibleDate(value: string, dateFormat: DateFormatHint = "MDY"): Date | null {
  // Dashes: no known source uses month-first dashes, so always prefer day-first here.
  const dayFirstDash = value.match(DAY_FIRST_DASH_PATTERN);
  if (dayFirstDash) {
    const [, day, month, year] = dayFirstDash;
    const parsed = tryDayFirst(day, month, year);
    if (parsed) return parsed;
  }

  // Slashes: genuinely ambiguous by convention (Treasury is MM/DD, GHANEPS is DD/MM).
  const slash = value.match(SLASH_DATE_PATTERN);
  if (slash) {
    const [, first, second, year] = slash;
    if (Number(first) > 12) {
      // Unambiguous regardless of convention — first segment can only be a day.
      const parsed = tryDayFirst(first, second, year);
      if (parsed) return parsed;
    } else if (Number(second) > 12) {
      // Unambiguous the other way — second segment can only be a day.
      const parsed = tryMonthFirst(first, second, year);
      if (parsed) return parsed;
    } else {
      // Both ≤12: genuinely ambiguous from the text alone — defer to the source's known convention.
      const parsed = dateFormat === "DMY" ? tryDayFirst(first, second, year) : tryMonthFirst(first, second, year);
      if (parsed) return parsed;
    }
  }

  const direct = new Date(value);
  if (!isNaN(direct.getTime())) return direct;

  const withoutOrdinals = value.replace(ORDINAL_SUFFIX_PATTERN, "$1");
  const reparsedOrdinal = new Date(withoutOrdinals);
  if (!isNaN(reparsedOrdinal.getTime())) return reparsedOrdinal;

  const match = value.match(DATE_SUBSTRING_PATTERN);
  if (match) {
    const reparsed = new Date(match[0]);
    if (!isNaN(reparsed.getTime())) return reparsed;
  }

  return null;
}

export function computeStatus(closingDate: string | null, dateFormat?: DateFormatHint): "open" | "closed" {
  if (!closingDate) return "open";
  const parsed = parseFlexibleDate(closingDate, dateFormat);
  if (!parsed) return "open";
  return parsed.getTime() < Date.now() ? "closed" : "open";
}

export function resolveClosingDate(closingDate: string | null | undefined, dateFormat?: DateFormatHint): string {
  if (closingDate) {
    const parsed = parseFlexibleDate(closingDate, dateFormat);
    if (parsed) return parsed.toISOString().slice(0, 10);
  }
  return NO_DEADLINE_SENTINEL;
}
