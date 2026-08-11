// Thin wrapper around Firecrawl's scrape endpoint.
// Requires FIRECRAWL_API_KEY in .env.local (not yet provided — add it before running real jobs).
import { firecrawlFetch } from "@/shared/lib/firecrawl";

export async function scrapeUrl(url: string) {
  const res = await firecrawlFetch("/v1/scrape", { url });

  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
