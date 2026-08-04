import type { SupabaseClient } from "@supabase/supabase-js";

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
}

/**
 * `tenders.source_url` is UNIQUE — with multiple scrape flows able to extract the same tender
 * from overlapping sources, a plain insert races: two jobs can both pass a "does it already
 * exist" check before either has committed, and the second insert throws a duplicate-key error.
 * Upsert-and-ignore sidesteps the race entirely (and drops the need to pre-fetch every existing
 * source_url on every batch).
 */
export async function insertTenderRows(supabase: SupabaseClient, rows: TenderRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  // Dedupe within this batch too — a single page can list the same tender twice.
  const seen = new Set<string>();
  const deduped = rows.filter((r) => (seen.has(r.source_url) ? false : (seen.add(r.source_url), true)));

  const { error } = await supabase.from("tenders").upsert(deduped, { onConflict: "source_url", ignoreDuplicates: true });
  if (error) throw error;
  return deduped.length;
}

export function computeStatus(closingDate: string | null): "open" | "closed" {
  if (!closingDate) return "open";
  const parsed = new Date(closingDate);
  if (isNaN(parsed.getTime())) return "open";
  return parsed.getTime() < Date.now() ? "closed" : "open";
}

export function resolveClosingDate(closingDate: string | null | undefined): string {
  if (closingDate) {
    const parsed = new Date(closingDate);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return NO_DEADLINE_SENTINEL;
}
