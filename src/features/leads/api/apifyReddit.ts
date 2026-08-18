import { apifyFetchRotating } from "@/shared/lib/apify";

// Firecrawl explicitly refuses to scrape reddit.com ("we do not support this site" — confirmed
// live, an outright blocklist entry, not a credit/rate issue), and Reddit's own public JSON API
// returns 403 from datacenter IPs (confirmed live too — the same would happen from a Vercel
// deploy). This actor uses Apify's residential proxy pool instead, which isn't blocked.
const ACTOR_ID = "trudax~reddit-scraper-lite";

export async function startRedditSearch(searchQuery: string, maxItems = 25) {
  const { res, apiKey } = await apifyFetchRotating(`/acts/${ACTOR_ID}/runs`, {
    searches: [searchQuery],
    searchPosts: true,
    sort: "new",
    maxItems,
    maxPostCount: maxItems,
    skipComments: true,
    includeMediaLinks: true,
  });
  if (!res.ok) throw new Error(`Failed to start Reddit Apify run: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return { runId: data.id as string, datasetId: data.defaultDatasetId as string, apiKey };
}
