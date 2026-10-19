import type { SupabaseClient } from "@supabase/supabase-js";
import { firecrawlFetch } from "@/shared/lib/firecrawl";

interface TenderWithAttachments {
  id: number | string;
  attachments?: { url: string; name?: string | null }[] | null;
}

/** Parses PDF attachments for newly inserted tenders and stores results in `tender_documents`.
 * Only URLs not already in the table are fetched — safe to call on re-runs. Returns the count
 * of documents successfully parsed. */
export async function parseTenderDocuments(
  supabase: SupabaseClient,
  tenders: TenderWithAttachments[]
): Promise<number> {
  // Collect PDF attachment URLs across all tenders
  const candidates: { tenderId: number | string; url: string; filename: string | null }[] = [];
  for (const tender of tenders) {
    for (const a of tender.attachments ?? []) {
      if (isPdfUrl(a.url)) {
        candidates.push({ tenderId: tender.id, url: a.url, filename: a.name ?? null });
      }
    }
  }
  if (candidates.length === 0) return 0;

  // Skip URLs already parsed
  const urls = candidates.map((c) => c.url);
  const { data: existing } = await supabase.from("tender_documents").select("url").in("url", urls);
  const alreadyParsed = new Set((existing ?? []).map((r: { url: string }) => r.url));
  const fresh = candidates.filter((c) => !alreadyParsed.has(c.url));
  if (fresh.length === 0) return 0;

  let parsed = 0;
  for (const { tenderId, url, filename } of fresh) {
    try {
      const res = await firecrawlFetch("/v1/scrape", { url, formats: ["markdown"] });
      const json = await res.json();
      const content: string | null = json?.data?.markdown ?? null;
      await supabase.from("tender_documents").upsert(
        { tender_id: tenderId, url, filename, parsed_content: content, parse_error: null, parsed_at: new Date().toISOString() },
        { onConflict: "url" }
      );
      parsed++;
    } catch (err: any) {
      await supabase.from("tender_documents").upsert(
        { tender_id: tenderId, url, filename, parsed_content: null, parse_error: String(err?.message ?? err), parsed_at: new Date().toISOString() },
        { onConflict: "url" }
      );
    }
  }
  return parsed;
}

function isPdfUrl(url: string): boolean {
  try {
    const lower = new URL(url).pathname.toLowerCase();
    return lower.endsWith(".pdf");
  } catch {
    return url.toLowerCase().includes(".pdf");
  }
}
