// Firecrawl's dedicated search endpoint — returns clean, structured web results for a query
// instead of us hand-building Bing/Yahoo/DuckDuckGo URLs and scraping raw SERP HTML ourselves
// (fragile, and search engines are actively hostile to being scraped that way).
import { firecrawlFetch } from "@/shared/lib/firecrawl";

export type SearchResult = {
  url: string;
  title?: string;
  description?: string;
};

export async function searchWeb(query: string, limit = 10): Promise<SearchResult[]> {
  const res = await firecrawlFetch("/v1/search", { query, limit });

  if (!res.ok) {
    throw new Error(`Firecrawl search failed for "${query}": ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  // Account/API-version dependent: newer Firecrawl returns { data: { web: [...] } },
  // older returns { data: [...] } directly. Handle both.
  const results = Array.isArray(body?.data) ? body.data : body?.data?.web;
  return Array.isArray(results)
    ? results.filter((r): r is SearchResult => !!r?.url).map((r) => ({ url: r.url, title: r.title, description: r.description }))
    : [];
}
