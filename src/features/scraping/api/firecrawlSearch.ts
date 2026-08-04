// Firecrawl's dedicated search endpoint — returns clean, structured web results for a query
// instead of us hand-building Bing/Yahoo/DuckDuckGo URLs and scraping raw SERP HTML ourselves
// (fragile, and search engines are actively hostile to being scraped that way).
export type SearchResult = {
  url: string;
  title?: string;
  description?: string;
};

export async function searchWeb(query: string, limit = 10): Promise<SearchResult[]> {
  const res = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit }),
  });

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
