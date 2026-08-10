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
// content per listing, not the site itself. The "leave blank" instruction matters as much as
// the "extract X" one — without it the model fabricates a plausible-looking category from the
// title alone on sites that never actually display one per listing (e.g. Job in Rwanda has a
// real category taxonomy, but it's never printed next to any individual tender), which then
// both over- and under-triggers keyword-based relevance filtering on a value that was never
// really there.
const FIELD_SUFFIX =
  " For each one, also extract the issuing organization/agency named on the page (not the aggregator site itself), location, and budget/value if stated. Also extract a category label, but only if the page explicitly shows one for that listing — leave it blank rather than guessing one from the title.";

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
    // The Python backend's old URL (/Listings/Tenders) 404s inside this Vue SPA now — the
    // current listings route is /tenders (confirmed live; the app's own nav/footer links
    // still pointed at the dead path).
    url: "https://tenders.go.ke/tenders",
    prompt: "Extract all tender listings on this Kenyan government procurement portal page, including title, closing/deadline date, and the full URL linking to each individual tender." + FIELD_SUFFIX,
    // Client-rendered SPA (Vue) — the listing table populates after JS runs, so it needs the
    // same render-settle allowance as UNGM.
    waitFor: 6000,
    timeout: 40000,
  },
  {
    tenderType: "ReliefWeb Jobs",
    // The old URL's `content=procurement` param wasn't a real filter at all — it returned
    // ~1.1M generic humanitarian updates (situation reports, disaster maps), and ReliefWeb's
    // own content-format taxonomy has no "procurement" category. ReliefWeb's job board,
    // however, does list genuine tenders/RFQs/EOIs from NGOs alongside job vacancies —
    // `?search=tender` on /jobs surfaces those (confirmed live: RFQs, EOIs, "Call for Tender"
    // postings mixed in with regular vacancies).
    url: "https://reliefweb.int/jobs?search=tender",
    prompt:
      "Extract all tender/procurement listings on this page (RFQs, RFPs, EOIs, tender notices — not regular job vacancies), including title, closing/deadline date if shown, and the full URL linking to each individual listing." +
      FIELD_SUFFIX,
    waitFor: 6000,
    timeout: 35000,
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
    // Large global notice board (~200KB+ of markdown) — a longer timeout gives it margin under
    // real-world load instead of relying on Firecrawl's default.
    waitFor: 6000,
    timeout: 40000,
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Deterministic backstop for `buildRelevanceClause` — the extraction prompt is only a soft
 * hint (the model doesn't reliably enforce it as a strict filter across every listing on a
 * page), so this re-checks each extracted tender's own text against the keyword list before
 * it's saved. Country isn't re-checked here: free-text `location` fields vary too much
 * ("Nairobi" vs "Kenya" vs "East Africa") for a substring match to be reliable.
 *
 * Uses word-boundary matching, not plain substring — short keyword abbreviations like "IT" and
 * "PR" otherwise false-positive inside unrelated words ("condIT ioners", "PReventive"), which
 * silently let irrelevant tenders through undetected. */
export function matchesKeywords(tender: { title: string; description?: string | null; category?: string | null }, keywords?: string[] | null): boolean {
  const kw = (keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (!kw.length) return true;
  const haystack = `${tender.title} ${tender.description || ""} ${tender.category || ""}`.toLowerCase();
  return kw.some((k) => new RegExp(`\\b${escapeRegExp(k)}\\b`, "i").test(haystack));
}
