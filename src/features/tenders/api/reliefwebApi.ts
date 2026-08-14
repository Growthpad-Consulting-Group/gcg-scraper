// ReliefWeb's own v2 API — replaces scraping the rendered /jobs?search=tender HTML board (a
// fragile "Vue-rendered page + LLM guesses structure" pipeline prone to the exact fabrication
// failure mode fixed elsewhere in this codebase: a page that hadn't fully loaded, or a sidebar
// link the model mistook for a real listing, could invent an organization/URL/date wholesale).
// This app's appname (growthpad-tenders-x7k2) was approved by the ReliefWeb team; confirmed live
// that v1 is decommissioned — v2 is the only working version.
import type { ExtractedTender } from "./firecrawlExtract";

const APPNAME = process.env.RELIEFWEB_APPNAME;

type ReliefwebJob = {
  id: string;
  fields: {
    title: string;
    body?: string;
    url?: string;
    url_alias?: string;
    source?: { name?: string }[];
    country?: { name?: string }[];
    type?: { name?: string }[];
    date?: { closing?: string };
  };
};

type ReliefwebResponse = {
  data?: ReliefwebJob[];
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

// ReliefWeb's job board mixes tenders/RFPs/RFQs/EOIs in among regular vacancies with no separate
// "tender" content type — a title-field Lucene query is the same signal the old scraped/LLM
// pipeline used (its URL was ?search=tender), just wider: it catches RFP/RFQ/EOI-titled posts
// that don't literally contain the word "tender" too (confirmed live: 16 matches here vs 3 for a
// plain "tender" full-text search).
const TITLE_QUERY = 'title:(tender OR RFP OR RFQ OR EOI OR ITB OR ITT OR "call for tender" OR "call for proposal" OR "request for proposal" OR "request for quotation" OR "expression of interest")';

/** Downstream relevance filtering (matchesKeywords/matchesCountries against the task's own
 * search_terms/countries) happens exactly like every other fixed source — this only narrows the
 * raw ReliefWeb feed down to procurement-flavored postings before that backstop runs. */
export async function fetchReliefwebTenders(): Promise<{ tenders: ExtractedTender[]; markdown: string }> {
  if (!APPNAME) throw new Error("RELIEFWEB_APPNAME is not configured");

  const params = new URLSearchParams({
    appname: APPNAME,
    "query[value]": TITLE_QUERY,
    limit: "50",
  });
  ["title", "body", "url", "url_alias", "source", "country", "type", "date.closing"].forEach((f) => params.append("fields[include][]", f));
  params.append("sort[]", "date.created:desc");

  let lastError: Error | undefined;
  let res: Response | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));

    res = await fetch(`https://api.reliefweb.int/v2/jobs?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (res.ok) break;

    lastError = new Error(`ReliefWeb API failed: ${res.status}`);
    if (!RETRYABLE_STATUSES.has(res.status)) throw lastError;
  }
  if (!res!.ok) throw lastError!;

  const data = (await res!.json()) as ReliefwebResponse;
  const jobs = data.data ?? [];

  const tenders: ExtractedTender[] = jobs.map((job) => ({
    title: job.fields.title,
    closing_date: job.fields.date?.closing ?? null,
    source_url: job.fields.url_alias || job.fields.url || null,
    description: job.fields.body || null,
    organization: job.fields.source?.[0]?.name ?? null,
    category: job.fields.type?.[0]?.name ?? null,
    location: job.fields.country?.[0]?.name ?? null,
    budget: null,
    document_url: null,
  }));

  // matchesSourceContent expects title AND organization to appear in the scraped markdown as its
  // anti-fabrication check — since these fields come straight from ReliefWeb's own API (not an
  // LLM guess), synthesize a ground-truth record the same way ppipApi.ts does, rather than
  // requiring the org's full name to appear verbatim in the (often abbreviation-only) body text.
  const markdown = jobs
    .map((job) => `${job.fields.title} ${job.fields.source?.[0]?.name ?? ""} ${job.fields.country?.[0]?.name ?? ""}`)
    .join("\n");

  return { tenders, markdown };
}
