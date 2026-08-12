// Shared Apify token rotation — mirrors firecrawl.ts's key-rotation pattern, with one important
// difference: Apify runs and datasets are scoped to the account that created them, so only the
// call that *starts* something new (an actor run, a run-sync dataset call) can rotate freely
// between keys. Once a run exists, every subsequent status/dataset/abort call must reuse the
// exact key that started it — a different account's token can't see another account's run.
const KEYS = [
  process.env.APIFY_API_TOKEN,
  process.env.APIFY_API_TOKEN_FALLBACK_1,
  process.env.APIFY_API_TOKEN_FALLBACK_2,
].filter((key): key is string => !!key);

function apifyKeys(): string[] {
  if (KEYS.length === 0) throw new Error("No Apify API token configured (APIFY_API_TOKEN / APIFY_API_TOKEN_FALLBACK_1/2)");
  return KEYS;
}

// 402 is Apify's status for an exceeded usage/spending limit; 429 is rate limiting. The text
// match is a backstop in case Apify ever returns either condition under a different status code.
function shouldRotate(status: number, bodyText: string): boolean {
  if (status === 402 || status === 429) return true;
  return /usage.?hard.?limit|rate.?limit|insufficient (funds|credits)/i.test(bodyText);
}

/**
 * POSTs to an Apify endpoint that starts something new, trying each configured key in order
 * until one succeeds. Returns the response AND which key worked — callers that get back a
 * run/dataset id must hang onto that key and pass it to every later call scoped to that id
 * (see apifyUrl), since Apify runs aren't visible across accounts.
 */
export async function apifyFetchRotating(path: string, body: object): Promise<{ res: Response; apiKey: string }> {
  const keys = apifyKeys();

  let lastResult: { res: Response; apiKey: string } | undefined;
  for (let i = 0; i < keys.length; i++) {
    const res = await fetch(apifyUrl(path, keys[i]), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { res, apiKey: keys[i] };

    const text = await res.clone().text();
    lastResult = { res, apiKey: keys[i] };
    if (!shouldRotate(res.status, text)) return lastResult;

    if (i < keys.length - 1) {
      console.warn(`Apify key ${i + 1}/${keys.length} unavailable (${res.status} on ${path}) — rotating to next key`);
    }
  }
  return lastResult!;
}

/** Builds an authenticated Apify API URL for a call scoped to an already-started run/dataset —
 * `apiKey` must be the exact key that created it (see apifyFetchRotating's return value). */
export function apifyUrl(path: string, apiKey: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `https://api.apify.com/v2${path}${sep}token=${apiKey}`;
}
