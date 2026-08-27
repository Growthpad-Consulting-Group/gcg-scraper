// Firecrawl and Apify usage/limits, per configured key — surfaced on the Settings page so
// running low on an account is visible ahead of time instead of discovered reactively via a
// job's 402/429 failure (confirmed live, repeatedly, before the multi-key rotation was added).
// Both endpoints' shapes were verified live before writing this, not assumed from docs.

export type ProviderUsage = {
  provider: "firecrawl" | "apify";
  label: string;
  used: number;
  limit: number;
  unit: "credits" | "USD";
  periodEnd: string | null;
  error?: string;
};

async function getFirecrawlUsage(label: string, key: string): Promise<ProviderUsage> {
  const base: ProviderUsage = { provider: "firecrawl", label, used: 0, limit: 0, unit: "credits", periodEnd: null };
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/team/credit-usage", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return { ...base, error: `HTTP ${res.status}` };
    const { data } = await res.json();
    return {
      ...base,
      used: data.plan_credits - data.remaining_credits,
      limit: data.plan_credits,
      periodEnd: data.billing_period_end ?? null,
    };
  } catch (err: any) {
    return { ...base, error: err.message ?? "request failed" };
  }
}

async function getApifyUsage(label: string, token: string): Promise<ProviderUsage> {
  const base: ProviderUsage = { provider: "apify", label, used: 0, limit: 0, unit: "USD", periodEnd: null };
  try {
    const res = await fetch(`https://api.apify.com/v2/users/me/limits?token=${token}`);
    if (!res.ok) return { ...base, error: `HTTP ${res.status}` };
    const { data } = await res.json();
    return {
      ...base,
      used: data.current?.monthlyUsageUsd ?? 0,
      limit: data.limits?.maxMonthlyUsageUsd ?? 0,
      periodEnd: data.monthlyUsageCycle?.endAt ?? null,
    };
  } catch (err: any) {
    return { ...base, error: err.message ?? "request failed" };
  }
}

/** Every configured key/token across both providers, labeled by rotation order (matches the
 * order shared/lib/firecrawl.ts and shared/lib/apify.ts actually try them in) — not just the
 * primary, since a fallback silently running low is just as worth knowing about. */
export async function getAllProviderUsage(): Promise<ProviderUsage[]> {
  const firecrawlKeys = [
    { label: "Firecrawl — primary", key: process.env.FIRECRAWL_API_KEY },
    { label: "Firecrawl — fallback 1", key: process.env.FIRECRAWL_API_KEY_FALLBACK_1 },
    { label: "Firecrawl — fallback 2", key: process.env.FIRECRAWL_API_KEY_FALLBACK_2 },
    { label: "Firecrawl — fallback 3", key: process.env.FIRECRAWL_API_KEY_FALLBACK_3 },
  ].filter((k): k is { label: string; key: string } => !!k.key);

  const apifyKeys = [
    { label: "Apify — primary", key: process.env.APIFY_API_TOKEN },
    { label: "Apify — fallback 1", key: process.env.APIFY_API_TOKEN_FALLBACK_1 },
    { label: "Apify — fallback 2", key: process.env.APIFY_API_TOKEN_FALLBACK_2 },
  ].filter((k): k is { label: string; key: string } => !!k.key);

  return Promise.all([
    ...firecrawlKeys.map((k) => getFirecrawlUsage(k.label, k.key)),
    ...apifyKeys.map((k) => getApifyUsage(k.label, k.key)),
  ]);
}
