// One entry per tender_type that has a dedicated source (as opposed to "Search Query Tenders",
// which runs a keyword search across generic search engines instead of a single fixed site).
// URLs and target sites ported from the retired Python backend's per-source scrapers.

export type SourceConfig = {
  tenderType: string;
  url: string;
  prompt: string;
  /** Milliseconds to wait for the page to settle before scraping — needed for heavy-JS sites
   * that render their listing asynchronously (e.g. UNGM), which otherwise hit Firecrawl's
   * SCRAPE_TIMEOUT before content finishes loading. */
  waitFor?: number;
  /** Milliseconds before Firecrawl gives up on this page. */
  timeout?: number;
  /** Some sites don't state a budget/value anywhere on the listing page, but the model still
   * fabricates a small decimal instead of omitting the field — drop it at the source rather than
   * storing noise. */
  skipBudget?: boolean;
};

// Appended to every prompt below: these are aggregator sites (UNGM, ReliefWeb, ...) where many
// different organizations post under one domain, so "who's asking" has to come from the page
// content per listing, not the site itself.
const FIELD_SUFFIX =
  " For each one, also extract the issuing organization/agency named on the page (not the aggregator site itself), a short category label, location, and budget/value if stated.";

export const SOURCE_CONFIGS: SourceConfig[] = [
  {
    tenderType: "UNGM Tenders",
    url: "https://www.ungm.org/Public/Notice",
    prompt: "Extract all procurement notices/tenders listed on this page, including title, closing/deadline date, and the full URL linking to each individual notice." + FIELD_SUFFIX,
    // UNGM's listing renders client-side and is slow to settle; Firecrawl's default timeout
    // was hitting SCRAPE_TIMEOUT (408) before the notices finished loading.
    waitFor: 8000,
    timeout: 45000,
    // The extractor fabricates tiny nonsense decimals (e.g. 0.08) for budget on this source
    // instead of omitting it — UNGM notices don't surface a budget/value on the listing page.
    skipBudget: true,
  },
  {
    tenderType: "PPIP",
    url: "https://tenders.go.ke/Listings/Tenders",
    prompt: "Extract all tender listings on this Kenyan government procurement portal page, including title, closing/deadline date, and the full URL linking to each individual tender." + FIELD_SUFFIX,
  },
  {
    tenderType: "ReliefWeb Jobs",
    url: "https://reliefweb.int/updates?content=procurement",
    prompt: "Extract all procurement/tender updates listed on this page, including title, closing/deadline date if shown, and the full URL linking to each individual update." + FIELD_SUFFIX,
  },
  {
    tenderType: "Kenya Treasury",
    url: "https://www.treasury.go.ke/tenders/",
    prompt: "Extract all tender listings on this Kenya National Treasury page, including title, closing/deadline date, and the full URL or document link for each tender." + FIELD_SUFFIX,
  },
  {
    tenderType: "UNDP",
    url: "https://procurement-notices.undp.org/",
    prompt: "Extract all procurement notices listed on this UNDP page, including title, deadline date, and the full URL linking to each individual notice." + FIELD_SUFFIX,
  },
  {
    tenderType: "Job in Rwanda",
    url: "https://www.jobinrwanda.com/jobs/tender",
    prompt: "Extract all tender listings on this page, including title, closing/deadline date, and the full URL linking to each individual tender." + FIELD_SUFFIX,
  },
];

export function getSourceConfig(tenderType: string) {
  return SOURCE_CONFIGS.find((c) => c.tenderType === tenderType);
}

/** Appended to a source's extraction prompt so aggregator sites (UNGM, ReliefWeb, ...) filter
 * for relevance instead of returning every listing on the page — without this, a task scrapes
 * tenders from anywhere in the world regardless of what the task owner actually operates in. */
export function buildRelevanceClause(keywords?: string[] | null, countries?: string[] | null): string {
  const kw = (keywords || []).map((k) => k.trim()).filter(Boolean);
  const cc = (countries || []).map((c) => c.trim()).filter(Boolean);
  if (!kw.length && !cc.length) return "";

  const parts: string[] = [];
  if (kw.length) parts.push(`related to any of: ${kw.join(", ")}`);
  if (cc.length) parts.push(`located in or targeting: ${cc.join(", ")}`);

  return `Only include tenders ${parts.join(" AND ")}. Skip any tender that doesn't match these criteria.`;
}

/** Deterministic backstop for `buildRelevanceClause` — the extraction prompt is only a soft
 * hint (the model doesn't reliably enforce it as a strict filter across every listing on a
 * page), so this re-checks each extracted tender's own text against the keyword list before
 * it's saved. Country isn't re-checked here: free-text `location` fields vary too much
 * ("Nairobi" vs "Kenya" vs "East Africa") for a substring match to be reliable. */
export function matchesKeywords(tender: { title: string; description?: string | null; category?: string | null }, keywords?: string[] | null): boolean {
  const kw = (keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (!kw.length) return true;
  const haystack = `${tender.title} ${tender.description || ""} ${tender.category || ""}`.toLowerCase();
  return kw.some((k) => haystack.includes(k));
}
