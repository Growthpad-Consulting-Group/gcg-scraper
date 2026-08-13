// PPIP's listing page (https://tenders.go.ke/tenders) is a Vue SPA with no real per-tender
// <a href> links — the "Actions" column is JS-driven text only. That left the LLM extractor with
// no ground-truth URL to read, so it fabricated one (confirmed live: a tender saved with
// source_url https://tenders.go.ke/tenders/KE-ICTA-554032-NC-RFB, a slug PPIP has never used —
// real detail URLs are https://tenders.go.ke/tenders/{numeric id}). PPIP exposes its own
// unauthenticated JSON API backing that same page at /api/active-tenders, with real numeric ids
// and structured fields — this reads that directly instead of screen-scraping+guessing.
import type { ExtractedTender } from "./firecrawlExtract";

type PpipApiTender = {
  id: number;
  title: string;
  tender_ref: string | null;
  close_at: string | null;
  published_at: string | null;
  procurement_category_id: number | null;
  pe?: { name?: string | null } | null;
};

type PpipApiResponse = {
  data: PpipApiTender[];
};

export async function fetchPpipTenders(): Promise<{ tenders: ExtractedTender[]; markdown: string }> {
  const res = await fetch("https://tenders.go.ke/api/active-tenders", {
    headers: { Accept: "application/json", Referer: "https://tenders.go.ke/tenders" },
  });
  if (!res.ok) throw new Error(`PPIP active-tenders API failed: ${res.status}`);

  const data = (await res.json()) as PpipApiResponse;
  const rows = Array.isArray(data?.data) ? data.data : [];

  const tenders: ExtractedTender[] = rows.map((row) => ({
    title: row.title,
    closing_date: row.close_at,
    source_url: `https://tenders.go.ke/tenders/${row.id}`,
    description: row.tender_ref ? `Tender ref: ${row.tender_ref}` : null,
    organization: row.pe?.name ?? null,
    category: null,
    location: "Kenya",
    budget: null,
    document_url: null,
  }));

  // matchesSourceContent expects the tender's title AND organization to appear in the scraped
  // markdown as its anti-fabrication check — since this data comes straight from PPIP's own API
  // (not an LLM guess), synthesize a markdown record of the raw API response as that ground truth
  // instead, including the procuring entity name so the organization check doesn't reject genuine
  // PPIP data for having no LLM-scraped page to point at.
  const markdown = rows.map((row) => `${row.title} ${row.tender_ref ?? ""} ${row.pe?.name ?? ""}`).join("\n");

  return { tenders, markdown };
}
