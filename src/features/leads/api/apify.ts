const ACTOR_ID = "compass~crawler-google-places";
const BASE_URL = "https://api.apify.com/v2";

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

export async function startGoogleMapsRun(searchString: string, maxCrawledPlaces = 30) {
  const res = await fetch(`${BASE_URL}/acts/${ACTOR_ID}/runs?token=${process.env.APIFY_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchString,
      maxCrawledPlaces,
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
    }),
  });
  if (!res.ok) throw new Error(`Failed to start Apify run: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return { runId: data.id as string, datasetId: data.defaultDatasetId as string };
}

export async function getRunStatus(runId: string) {
  const res = await fetch(`${BASE_URL}/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`);
  if (!res.ok) throw new Error(`Failed to check Apify run status: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return data.status as "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
}

export async function abortRun(runId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/actor-runs/${runId}/abort?token=${process.env.APIFY_API_TOKEN}`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to abort Apify run: ${res.status} ${await res.text()}`);
}

export async function getDatasetItems(datasetId: string): Promise<GoogleMapsPlace[]> {
  const res = await fetch(`${BASE_URL}/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}`);
  if (!res.ok) throw new Error(`Failed to fetch Apify dataset: ${res.status} ${await res.text()}`);
  return res.json();
}
