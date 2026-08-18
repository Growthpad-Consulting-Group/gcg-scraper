import { apifyFetchRotating, apifyUrl } from "@/shared/lib/apify";

const ACTOR_ID = "compass~crawler-google-places";

export type LeadEnrichmentContact = {
  fullName?: string;
  jobTitle?: string;
  email?: string | null;
  mobileNumber?: string | null;
  linkedinProfile?: string | null;
  companyName?: string | null;
  [key: string]: unknown;
};

type GoogleMapsPlace = {
  title?: string;
  categoryName?: string;
  address?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  /** Populated only when `scrapeContacts` is enabled — pulled from the business's own website,
   * not from the Google Maps listing itself (which has no email field). */
  emails?: string[];
  /** Populated only when `maximumLeadsEnrichmentRecords` is enabled — named employees at this
   * business with work email, phone, and LinkedIn profile. This is the only source of LinkedIn
   * contact info in the app: the dedicated LinkedIn actor is a no-login public search tool and
   * has no access to data LinkedIn doesn't expose without a logged-in session. */
  leadsEnrichment?: LeadEnrichmentContact[];
  [key: string]: unknown;
};

export async function startGoogleMapsRun(searchString: string, maxCrawledPlaces = 30, countryCode?: string) {
  const { res, apiKey } = await apifyFetchRotating(`/acts/${ACTOR_ID}/runs`, {
    searchString,
    maxCrawledPlaces,
    // Hard geo-filter (ISO 3166-1 alpha-2) on top of baking the location into searchString —
    // the text alone is a soft hint to Google Maps and can occasionally return results outside
    // the intended country; countryCode is a real actor-level constraint. Omitted (rather than
    // guessed) when the location text doesn't resolve to a recognizable country.
    // Confirmed live: this actor's input schema only accepts lowercase codes ("ke", not "KE") —
    // countryCodes.ts's ISO map is conventionally uppercase, so it's lowercased only here, at the
    // one call site that actually needs Apify's specific casing.
    ...(countryCode ? { countryCode: countryCode.toLowerCase() } : {}),
    proxyConfig: { useApifyProxy: true },
    // Cheap add-on ($0.002/place vs $0.004/place base) that visits each business's own website
    // to pull a contact email — Google Maps listings themselves never expose one.
    scrapeContacts: true,
    // Business leads enrichment ($0.005/lead) — finds named employees (name, title, work
    // email, phone, LinkedIn profile) for each place. Capped at 3/place to bound cost. Places
    // without a website just won't have anything to enrich from — left un-filtered rather than
    // excluding no-website places outright, since those are still valid leads on their own
    // (phone/address), just without contact enrichment.
    maximumLeadsEnrichmentRecords: 3,
  });
  if (!res.ok) throw new Error(`Failed to start Apify run: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  // The key that started this run must be reused for every later call scoped to it (status
  // polling, abort, dataset fetch) — a different account's token can't see this run at all.
  return { runId: data.id as string, datasetId: data.defaultDatasetId as string, apiKey };
}

export async function getRunStatus(runId: string, apiKey: string) {
  const res = await fetch(apifyUrl(`/actor-runs/${runId}`, apiKey));
  if (!res.ok) throw new Error(`Failed to check Apify run status: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return data.status as "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
}

export async function abortRun(runId: string, apiKey: string): Promise<void> {
  const res = await fetch(apifyUrl(`/actor-runs/${runId}/abort`, apiKey), { method: "POST" });
  if (!res.ok) throw new Error(`Failed to abort Apify run: ${res.status} ${await res.text()}`);
}

export async function getDatasetItems(datasetId: string, apiKey: string): Promise<GoogleMapsPlace[]> {
  const res = await fetch(apifyUrl(`/datasets/${datasetId}/items`, apiKey));
  if (!res.ok) throw new Error(`Failed to fetch Apify dataset: ${res.status} ${await res.text()}`);
  return res.json();
}
