// Firecrawl and Apify usage/limits, per configured key — surfaced on the Settings page so
// running low on an account is visible ahead of time instead of discovered reactively via a
// job's 402/429 failure (confirmed live, repeatedly, before the multi-key rotation was added).
// Both endpoints' shapes were verified live before writing this, not assumed from docs.
import { KEYS as FIRECRAWL_KEYS } from "./firecrawl";
import { KEYS as APIFY_KEYS } from "./apify";

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

/** Labels a provider's rotation-ordered key array ("primary", "fallback 1", "fallback 2", ...)
 * without hand-listing env var names a second time — index 0 is always primary since that's how
 * both firecrawl.ts and apify.ts build their KEYS arrays. */
function labelKeys(providerName: string, keys: string[]): { label: string; key: string }[] {
  return keys.map((key, i) => ({ label: i === 0 ? `${providerName} — primary` : `${providerName} — fallback ${i}`, key }));
}

/** Every configured key/token across both providers, labeled by rotation order (matches the
 * order shared/lib/firecrawl.ts and shared/lib/apify.ts actually try them in, since it reads the
 * exact same KEYS arrays) — not just the primary, since a fallback silently running low is just
 * as worth knowing about. */
export async function getAllProviderUsage(): Promise<ProviderUsage[]> {
  const firecrawlKeys = labelKeys("Firecrawl", FIRECRAWL_KEYS);
  const apifyKeys = labelKeys("Apify", APIFY_KEYS);

  return Promise.all([
    ...firecrawlKeys.map((k) => getFirecrawlUsage(k.label, k.key)),
    ...apifyKeys.map((k) => getApifyUsage(k.label, k.key)),
  ]);
}
