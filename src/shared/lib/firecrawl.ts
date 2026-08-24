// Shared low-level Firecrawl request helper — every Firecrawl call in the app (scrape, search,
// extract, parse, LinkedIn link resolution) goes through this so the multi-key rotation logic
// only has to be implemented once. Each of these is a genuinely separate Firecrawl account with
// its own credit balance and its own rate-limit budget — rotating through them (rather than
// retrying the same one) is what actually resolves a 402/429, not just a second attempt against
// the same constrained account.
const KEYS = [
  process.env.FIRECRAWL_API_KEY,
  process.env.FIRECRAWL_API_KEY_FALLBACK_1,
  process.env.FIRECRAWL_API_KEY_FALLBACK_2,
  process.env.FIRECRAWL_API_KEY_FALLBACK_3,
  process.env.FIRECRAWL_API_KEY_FALLBACK_4,
  process.env.FIRECRAWL_API_KEY_FALLBACK_5,
].filter((key): key is string => !!key);

// 402 is Firecrawl's documented status for an exhausted/insufficient-credit account. 429 is rate
// limiting — confirmed live (repeatedly) that per-function `throttle` configs in this app don't
// prevent it: they only cap how many *jobs* start per minute each, not the combined Firecrawl
// call volume once several different job types (or a manual retry) happen to be active in the
// same window, and Firecrawl's rate limit is a single account-wide budget shared across every
// endpoint. The text match is a backstop in case Firecrawl ever returns either condition under a
// different status code.
function shouldRotate(status: number, bodyText: string): boolean {
  if (status === 402 || status === 429) return true;
  return /insufficient credits|out of credits|payment required|quota exceeded|rate limit/i.test(bodyText);
}

/**
 * POSTs to a Firecrawl endpoint, trying each configured key in order until one succeeds — on a
 * credit-exhaustion or rate-limit response, moves to the next key rather than retrying the same
 * one. `body` may be a JSON-serializable object (sent as `application/json`) or a `FormData`
 * instance (sent as-is, for /parse's file uploads) — safe to reuse across attempts since FormData
 * isn't a consumed stream.
 */
export async function firecrawlFetch(path: string, body: object | FormData): Promise<Response> {
  if (KEYS.length === 0) throw new Error("No Firecrawl API key configured (FIRECRAWL_API_KEY / FIRECRAWL_API_KEY_FALLBACK_1/2/3)");
  const isFormData = body instanceof FormData;

  const doFetch = (key: string) =>
    fetch(`https://api.firecrawl.dev${path}`, {
      method: "POST",
      headers: isFormData ? { Authorization: `Bearer ${key}` } : { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: isFormData ? (body as FormData) : JSON.stringify(body),
    });

  let lastResponse: Response | undefined;
  for (let i = 0; i < KEYS.length; i++) {
    const res = await doFetch(KEYS[i]);
    if (res.ok) return res;

    const text = await res.clone().text();
    lastResponse = res;
    if (!shouldRotate(res.status, text)) return res;

    if (i < KEYS.length - 1) {
      console.warn(`Firecrawl key ${i + 1}/${KEYS.length} unavailable (${res.status} on ${path}) — rotating to next key`);
    }
  }

  return lastResponse!;
}
