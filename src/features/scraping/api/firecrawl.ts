// Thin wrapper around Firecrawl's scrape endpoint.
// Requires FIRECRAWL_API_KEY in .env.local (not yet provided — add it before running real jobs).
export async function scrapeUrl(url: string) {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
