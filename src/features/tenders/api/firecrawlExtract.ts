// Structured tender extraction via Firecrawl, replacing the old Python backend's per-source
// Selenium + BeautifulSoup scrapers. Firecrawl handles JS rendering itself and returns
// already-structured data, so there's no need to hand-maintain CSS selectors per site.

import { firecrawlFetch } from "@/shared/lib/firecrawl";

export type ExtractedTender = {
  title: string;
  closing_date: string | null;
  source_url: string | null;
  description?: string | null;
  organization?: string | null;
  category?: string | null;
  location?: string | null;
  budget?: number | null;
  /** ISO 4217 currency code the budget is denominated in (e.g. "USD", "KES", "GHS") — extracted
   * alongside budget instead of alongside it being silently discarded; a bare number is
   * ambiguous across an app now spanning many countries' tenders. */
  currency?: string | null;
  document_url?: string | null;
};

export type ExtractResult = {
  tenders: ExtractedTender[];
  /** Raw markdown of the scraped page — shared across every tender pulled from that one page,
   * since most sources are a single listing page rather than per-tender detail pages. Powers the
   * Tenders table's "raw" view, which previously just re-serialized the parsed row as JSON. */
  markdown: string | null;
};

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    tenders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          closing_date: { type: "string", description: "Deadline/closing date in ISO 8601 format (YYYY-MM-DD) if determinable, otherwise the raw date text" },
          source_url: { type: "string", description: "Full absolute URL linking to this specific tender/notice" },
          description: { type: "string" },
          organization: { type: "string", description: "The issuing organization/agency/company that published this tender — not the aggregator site, the actual issuer named on the page" },
          category: { type: "string", description: "Sector/category, e.g. 'IT', 'Construction', 'Consultancy', 'Supplies' — a short label, not a sentence" },
          location: { type: "string", description: "Country or city the tender applies to, if stated" },
          budget: { type: "number", description: "Estimated value/budget as a plain number (no currency symbol or commas) if stated, otherwise omit" },
          currency: { type: "string", description: "The 3-letter ISO 4217 currency code the budget is stated in (e.g. USD, KES, GHS, EUR) if a budget is given — infer from a currency symbol/code shown, otherwise omit rather than guessing" },
          document_url: { type: "string", description: "Direct URL to the downloadable tender document/PDF, if different from source_url (the listing page)" },
        },
        required: ["title"],
      },
    },
  },
  required: ["tenders"],
};

export type ExtractOptions = {
  onlyMainContent?: boolean;
  /** Milliseconds to wait for the page to settle (JS rendering, lazy content) before scraping. */
  waitFor?: number;
  /** Milliseconds before Firecrawl gives up on this page. */
  timeout?: number;
  /** Serve a cached scrape younger than this many milliseconds instead of re-fetching, if Firecrawl has one. */
  maxAge?: number;
  /** CSS selectors to strip from the page before extraction (e.g. "nav", ".cookie-banner"). */
  excludeTags?: string[];
  /** CSS selectors to keep — when set, only these parts of the page are considered. */
  includeTags?: string[];
  /** "stealth" routes through Firecrawl's anti-bot-detection proxy — costs more per request, so
   * only set this for sources that actually sit behind a bot challenge (e.g. AfDB's Cloudflare
   * managed challenge blocks the default proxy outright). */
  proxy?: "basic" | "stealth";
};

// 408 (SCRAPE_TIMEOUT) included alongside rate-limit/server-error statuses — confirmed live that a
// heavy page (UNDP's ~200KB+ notice board) can time out on an otherwise-fine run even with an
// already-raised per-source timeout; a transient slow load is worth a retry, not an immediate fail.
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

export async function extractTenders(url: string, prompt: string, options?: ExtractOptions): Promise<ExtractResult> {
  const body = {
    url,
    formats: ["markdown", "extract"],
    extract: { schema: EXTRACTION_SCHEMA, prompt },
    onlyMainContent: options?.onlyMainContent ?? true,
    ...(options?.waitFor ? { waitFor: options.waitFor } : {}),
    ...(options?.timeout ? { timeout: options.timeout } : {}),
    ...(options?.maxAge ? { maxAge: options.maxAge } : {}),
    ...(options?.excludeTags?.length ? { excludeTags: options.excludeTags } : {}),
    ...(options?.includeTags?.length ? { includeTags: options.includeTags } : {}),
    ...(options?.proxy ? { proxy: options.proxy } : {}),
  };

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));

    const res = await firecrawlFetch("/v1/scrape", body);

    if (!res.ok) {
      const text = await res.text();
      lastError = new Error(`Firecrawl extract failed for ${url}: ${res.status} ${text}`);
      if (!RETRYABLE_STATUSES.has(res.status)) throw lastError;
      continue;
    }

    const data = await res.json();
    const tenders = data?.data?.extract?.tenders;
    const markdown = typeof data?.data?.markdown === "string" ? data.data.markdown : null;
    // A 200 with a shape Firecrawl has changed underneath us reads identically to "genuinely no
    // tenders on this page" downstream — flag it here, where the actual raw response is in hand,
    // instead of leaving "0 new tenders" undiagnosable from the job log alone.
    if (!Array.isArray(tenders)) {
      console.warn(`Firecrawl /v1/scrape for ${url}: expected data.extract.tenders to be an array, got`, JSON.stringify(data).slice(0, 500));
    }
    return { tenders: Array.isArray(tenders) ? tenders : [], markdown };
  }

  throw lastError!;
}

// Matches an actual downloadable file, not just any URL containing "file"-ish substrings
// (e.g. a nav link like ".../targetproductprofiles" would false-positive on a bare /file/i test).
const DOCUMENT_LINK_PATTERN = /\.pdf(\?|$)|\.docx?(\?|$)|\.xlsx?(\?|$)|\bdownload\b|\battachment\b/i;

/** Fetches a tender's own detail page (one level deeper than the listing page extraction sees)
 * and picks out the real document/PDF link, for sources like UNGM where the listing-page
 * extraction can only see the notice URL itself, not its attached files. */
export async function resolveDocumentLink(url: string): Promise<string | null> {
  const res = await firecrawlFetch("/v1/scrape", { url, formats: ["links"], onlyMainContent: false, waitFor: 5000, timeout: 25000 });
  if (!res.ok) return null;

  const data = await res.json();
  const links: string[] = Array.isArray(data?.data?.links) ? data.data.links : [];
  if (!Array.isArray(data?.data?.links)) {
    console.warn(`Firecrawl /v1/scrape (links) for ${url}: expected data.links to be an array, got`, JSON.stringify(data).slice(0, 500));
  }
  const candidates = links.filter((l) => l !== url && DOCUMENT_LINK_PATTERN.test(l));
  if (!candidates.length) return null;

  // Prefer a single-document link over a "download all" bundle when both are present.
  return candidates.find((l) => !/all/i.test(l)) ?? candidates[0];
}
