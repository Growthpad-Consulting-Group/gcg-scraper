// Firecrawl's dedicated search endpoint — returns clean, structured web results for a query
// instead of us hand-building Bing/Yahoo/DuckDuckGo URLs and scraping raw SERP HTML ourselves
// (fragile, and search engines are actively hostile to being scraped that way).
import { firecrawlFetch } from "@/shared/lib/firecrawl";

export type SearchResult = {
  url: string;
  title?: string;
  description?: string;
};

// Confirmed live: this endpoint has its own separate per-minute rate limit from /v1/scrape (a
// 429 here reported "Consumed 27/min" vs the scrape endpoint's 18/min) — a single 429 used to
// fail the whole job outright since this had no retry at all, unlike extractTenders.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

export async function searchWeb(query: string, limit = 10): Promise<SearchResult[]> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));

    const res = await firecrawlFetch("/v1/search", { query, limit });

    if (!res.ok) {
      const text = await res.text();
      lastError = new Error(`Firecrawl search failed for "${query}": ${res.status} ${text}`);
      if (!RETRYABLE_STATUSES.has(res.status)) throw lastError;
      continue;
    }

    const body = await res.json();
    // Account/API-version dependent: newer Firecrawl returns { data: { web: [...] } },
    // older returns { data: [...] } directly. Handle both.
    const results = Array.isArray(body?.data) ? body.data : body?.data?.web;
    if (!Array.isArray(results)) {
      console.warn(`Firecrawl /v1/search for "${query}": response matched neither known data shape, got`, JSON.stringify(body).slice(0, 500));
      return [];
    }
    return results.filter((r): r is SearchResult => !!r?.url).map((r) => ({ url: r.url, title: r.title, description: r.description }));
  }

  throw lastError!;
}
