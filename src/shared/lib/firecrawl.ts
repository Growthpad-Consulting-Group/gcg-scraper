// Shared low-level Firecrawl request helper — every Firecrawl call in the app (scrape, search,
// extract, parse, LinkedIn link resolution) goes through this so the credit-exhaustion fallback
// only has to be implemented once. FIRECRAWL_API_KEY_FALLBACK is a second Firecrawl account kept
// specifically for when the primary one runs out of credits mid-month.
const PRIMARY_KEY = process.env.FIRECRAWL_API_KEY;
const FALLBACK_KEY = process.env.FIRECRAWL_API_KEY_FALLBACK;

// 402 is Firecrawl's documented status for an exhausted/insufficient-credit account; the text
// match is a backstop in case they ever return it under a different status code instead. Only
// these should trigger a fallback retry — anything else (a bad request, a real site error) would
// just fail identically on the fallback account too, and retrying it wastes the second account's
// credits on a request that was never going to succeed.
function isCreditExhaustion(status: number, bodyText: string): boolean {
  if (status === 402) return true;
  return /insufficient credits|out of credits|payment required|quota exceeded/i.test(bodyText);
}

/**
 * POSTs to a Firecrawl endpoint with the primary API key; on a credit-exhaustion response,
 * retries once with the fallback key if one is configured. `body` may be a JSON-serializable
 * object (sent as `application/json`) or a `FormData` instance (sent as-is, for /parse's file
 * uploads) — safe to reuse across the retry since FormData isn't a consumed stream.
 */
export async function firecrawlFetch(path: string, body: object | FormData): Promise<Response> {
  const isFormData = body instanceof FormData;

  const doFetch = (key: string | undefined) =>
    fetch(`https://api.firecrawl.dev${path}`, {
      method: "POST",
      headers: isFormData ? { Authorization: `Bearer ${key}` } : { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: isFormData ? (body as FormData) : JSON.stringify(body),
    });

  const primary = await doFetch(PRIMARY_KEY);
  if (primary.ok || !FALLBACK_KEY) return primary;

  const text = await primary.clone().text();
  if (!isCreditExhaustion(primary.status, text)) return primary;

  console.warn(`Firecrawl primary key exhausted (${primary.status} on ${path}) — retrying with fallback key`);
  return doFetch(FALLBACK_KEY);
}
