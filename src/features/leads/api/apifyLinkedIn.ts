import { apifyFetchRotating } from "@/shared/lib/apify";

// harvestapi/linkedin-profile-search hits a hard "10 free runs" cap on Apify's free plan;
// this actor (no-cookie, SERP-based) doesn't have that restriction and returns equivalent data.
const ACTOR_ID = "fabri-lab~linkedin-public-search-lead-extractor";

// Separate no-cookie actor used only to enrich profiles the search above already found, with a
// work email — this search actor itself never returns one (it's SERP-snippet based, not a real
// profile visit). Confirmed live: this one does return a real email when `includeEmail` is set;
// there is no field for phone anywhere in its output under any settings — LinkedIn doesn't
// publish phone numbers on public profiles regardless of which actor or cookies are used, so
// that's not obtainable at all, not just by this actor.
const ENRICH_ACTOR_ID = "apimaestro~linkedin-profile-batch-scraper-no-cookies-required";

export async function startLinkedInSearch(searchQuery: string, locations: string[], maxItems = 25) {
  const { res, apiKey } = await apifyFetchRotating(`/acts/${ACTOR_ID}/runs`, {
    searchQuery,
    locations: locations.length > 0 ? locations : undefined,
    maxItems,
    profileScraperMode: "Short",
  });
  if (!res.ok) throw new Error(`Failed to start LinkedIn Apify run: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  // Must reuse this same key for every later call scoped to this run (status polling, abort,
  // dataset fetch) — a different account's token can't see this run at all.
  return { runId: data.id as string, datasetId: data.defaultDatasetId as string, apiKey };
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

  // Self-contained run-sync call (no run/dataset id to track across requests), so it's safe to
  // rotate keys freely here rather than pinning to whichever key started an unrelated run.
  const { res } = await apifyFetchRotating(`/acts/${ENRICH_ACTOR_ID}/run-sync-get-dataset-items`, { usernames, includeEmail: true });
  if (!res.ok) return {};

  const items: any[] = await res.json();
  const emails: Record<string, string | null> = {};
  for (const item of items) {
    const username = item?.basic_info?.public_identifier;
    if (username) emails[username] = item?.basic_info?.email ?? null;
  }
  return emails;
}
