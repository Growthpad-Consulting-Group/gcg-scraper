const ACTOR_ID = "compass~crawler-google-places";
const BASE_URL = "https://api.apify.com/v2";

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
  [key: string]: unknown;
};

export async function startGoogleMapsRun(searchString: string, maxCrawledPlaces = 30) {
  const res = await fetch(`${BASE_URL}/acts/${ACTOR_ID}/runs?token=${process.env.APIFY_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchString, maxCrawledPlaces, proxyConfig: { useApifyProxy: true } }),
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
