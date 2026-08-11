// harvestapi/linkedin-profile-search hits a hard "10 free runs" cap on Apify's free plan;
// this actor (no-cookie, SERP-based) doesn't have that restriction and returns equivalent data.
const ACTOR_ID = "fabri-lab~linkedin-public-search-lead-extractor";
const BASE_URL = "https://api.apify.com/v2";

// Separate no-cookie actor used only to enrich profiles the search above already found, with a
// work email — this search actor itself never returns one (it's SERP-snippet based, not a real
// profile visit). Confirmed live: this one does return a real email when `includeEmail` is set;
// there is no field for phone anywhere in its output under any settings — LinkedIn doesn't
// publish phone numbers on public profiles regardless of which actor or cookies are used, so
// that's not obtainable at all, not just by this actor.
const ENRICH_ACTOR_ID = "apimaestro~linkedin-profile-batch-scraper-no-cookies-required";

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

/** Pulls the `/in/{username}` slug out of a LinkedIn profile URL — the enrichment actor takes
 * usernames, not full URLs. */
export function extractLinkedInUsername(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Best-effort email enrichment for a batch of profile usernames — keyed by username so callers
 * can look up each profile's email (or its absence) without relying on result ordering. A failure
 * here degrades to "no emails" rather than failing the whole lead search, since this is a bonus
 * on top of profile discovery, not the main result. */
export async function enrichLinkedInEmails(usernames: string[]): Promise<Record<string, string | null>> {
  if (!usernames.length) return {};

  const res = await fetch(`${BASE_URL}/acts/${ENRICH_ACTOR_ID}/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames, includeEmail: true }),
  });
  if (!res.ok) return {};

  const items: any[] = await res.json();
  const emails: Record<string, string | null> = {};
  for (const item of items) {
    const username = item?.basic_info?.public_identifier;
    if (username) emails[username] = item?.basic_info?.email ?? null;
  }
  return emails;
}
