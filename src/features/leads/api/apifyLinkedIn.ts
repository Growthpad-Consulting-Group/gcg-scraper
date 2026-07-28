// harvestapi/linkedin-profile-search hits a hard "10 free runs" cap on Apify's free plan;
// this actor (no-cookie, SERP-based) doesn't have that restriction and returns equivalent data.
const ACTOR_ID = "fabri-lab~linkedin-public-search-lead-extractor";
const BASE_URL = "https://api.apify.com/v2";

export async function startLinkedInSearch(searchQuery: string, locations: string[], maxItems = 25) {
  const res = await fetch(`${BASE_URL}/acts/${ACTOR_ID}/runs?token=${process.env.APIFY_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchQuery,
      locations: locations.length > 0 ? locations : undefined,
      maxItems,
      profileScraperMode: "Short",
    }),
  });
  if (!res.ok) throw new Error(`Failed to start LinkedIn Apify run: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return { runId: data.id as string, datasetId: data.defaultDatasetId as string };
}
