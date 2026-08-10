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
  title: string;
  closing_date: string;
}

export interface InsertResult {
  inserted: number;
  open: number;
  closed: number;
  /** Title + closing_date only, for building a Slack/email summary without a second query. */
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

  const { error } = await supabase.from("tenders").upsert(deduped, { onConflict: "source_url", ignoreDuplicates: true });
  if (error) throw error;

  return {
    inserted: deduped.length,
    open: deduped.filter((r) => r.status === "open").length,
    closed: deduped.filter((r) => r.status === "closed").length,
    rows: deduped.map((r) => ({ title: r.title, closing_date: r.closing_date })),
  };
}

// Despite the extraction schema asking for ISO 8601, some sources come back with a date `new
// Date()` can't parse directly: Kenya Treasury wraps it in extra text ("Thu, 08/06/2026 -
// 15:00" — Date chokes on the " - 15:00" suffix, not the date itself), and PPIP uses ordinal
// day suffixes ("August 11th, 2026" — Date chokes on "th"). Both were silently getting treated
// as if there were no deadline at all (open forever, sorts as "no closing date") instead of
// being worth a second parse attempt. Shared by resolveClosingDate and computeStatus so both
// treat the same raw value consistently instead of one parsing it and the other giving up.
const ORDINAL_SUFFIX_PATTERN = /(\d+)(st|nd|rd|th)\b/gi;
const DATE_SUBSTRING_PATTERN = /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/;

function parseFlexibleDate(value: string): Date | null {
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

export function computeStatus(closingDate: string | null): "open" | "closed" {
  if (!closingDate) return "open";
  const parsed = parseFlexibleDate(closingDate);
  if (!parsed) return "open";
  return parsed.getTime() < Date.now() ? "closed" : "open";
}

export function resolveClosingDate(closingDate: string | null | undefined): string {
  if (closingDate) {
    const parsed = parseFlexibleDate(closingDate);
    if (parsed) return parsed.toISOString().slice(0, 10);
  }
  return NO_DEADLINE_SENTINEL;
}
