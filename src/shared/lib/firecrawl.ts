// Shared low-level Firecrawl request helper — every Firecrawl call in the app (scrape, search,
// extract, parse, LinkedIn link resolution) goes through this so the fallback-account logic only
// has to be implemented once. FIRECRAWL_API_KEY_FALLBACK is a second Firecrawl account.
const PRIMARY_KEY = process.env.FIRECRAWL_API_KEY;
const FALLBACK_KEY = process.env.FIRECRAWL_API_KEY_FALLBACK;

// 402 is Firecrawl's documented status for an exhausted/insufficient-credit account. 429 is rate
// limiting — confirmed live (repeatedly) that per-function `throttle` configs in this app don't
// prevent it: they only cap how many *jobs* start per minute each, not the combined Firecrawl
// call volume once several different job types (or a manual retry) happen to be active in the
// same window, and Firecrawl's rate limit is a single account-wide budget shared across every
// endpoint. Since the fallback key is a genuinely separate account with its own separate budget,
// routing a 429 there too — not just retrying the same saturated account — actually resolves it
// instead of exponential-backoff-ing against a budget that's still being consumed by other
// concurrent jobs. The text match is a backstop in case Firecrawl ever returns either condition
// under a different status code.
function shouldUseFallback(status: number, bodyText: string): boolean {
  if (status === 402 || status === 429) return true;
  return /insufficient credits|out of credits|payment required|quota exceeded|rate limit/i.test(bodyText);
}

/**
 * POSTs to a Firecrawl endpoint with the primary API key; on a credit-exhaustion or rate-limit
 * response, retries with the fallback key if one is configured — a genuinely separate account
 * with its own budget, not just a second attempt against the same constrained one. `body` may be
 * a JSON-serializable object (sent as `application/json`) or a `FormData` instance (sent as-is,
 * for /parse's file uploads) — safe to reuse across the retry since FormData isn't a consumed
 * stream.
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
  if (!shouldUseFallback(primary.status, text)) return primary;

  console.warn(`Firecrawl primary key unavailable (${primary.status} on ${path}) — retrying with fallback key`);
  return doFetch(FALLBACK_KEY);
}
