// Confirmed live: run-website-scrape.ts and run-scrape.ts both fired every item's Firecrawl call
// via a single `Promise.all` (up to 30 and 15 at once respectively) — fine on a high-limit
// account, but this app's Firecrawl account caps at 18 req/min, so a full-width burst guarantees
// a wave of simultaneous 429s that only survive because extractTenders' own retry happens to
// absorb most of them. Bounded concurrency keeps the burst under the account's real ceiling
// instead of relying on retries to paper over it.

/** Runs `fn` over `items`, at most `limit` in flight at once — preserves each item's own error
 * handling (whatever `fn` returns/throws per item), just bounds how many run concurrently. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
