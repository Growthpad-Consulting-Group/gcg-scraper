// One entry per tender_type that has a dedicated source (as opposed to "Search Query Tenders",
// which runs a keyword search across generic search engines instead of a single fixed site).
// URLs and target sites ported from the retired Python backend's per-source scrapers.

import type { DateFormatHint } from "./tenderRow";
import { normalizeCountry, expandCountryFilter } from "./countries";
import { normalizeSpellingVariants, expandAcronymVariants } from "./textVariants";

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
  /** "stealth" for sources sitting behind a bot challenge that blocks Firecrawl's default proxy
   * outright (e.g. AfDB's Cloudflare managed challenge) — costs more per request, so only set
   * this where the plain default proxy has been confirmed not to work. */
  proxy?: "basic" | "stealth";
  /** Disambiguates this source's slash-separated dates when both day and month are ≤12 (e.g.
   * GHANEPS's "08/09/2026") — see DateFormatHint in tenderRow.ts. Omit when the source's dates
   * are unambiguous (dashes, month names) or when it's known/assumed MM/DD (the default). */
  dateFormat?: DateFormatHint;
};

// Appended to every prompt below: these are aggregator sites (UNGM, ReliefWeb, ...) where many
// different organizations post under one domain, so "who's asking" has to come from the page
// content per listing, not the site itself. The "leave blank" instruction matters as much as
// the "extract X" one — without it the model fabricates a plausible-looking category from the
// title alone on sites that never actually display one per listing (e.g. Job in Rwanda has a
// real category taxonomy, but it's never printed next to any individual tender), which then
// both over- and under-triggers keyword-based relevance filtering on a value that was never
// really there.
export const FIELD_SUFFIX =
  " For each one, also extract the issuing organization/agency named on the page (not the aggregator site itself), location, and budget/value if stated. Also extract a category label, but only if the page explicitly shows one for that listing — leave it blank rather than guessing one from the title. If the listing belongs to a broader project or programme named on the page (multi-project funder sites like World Bank/AfDB), include that project name in the description — a notice's own title is sometimes too generic (e.g. \"CERT Enhancement\") to tell what it's actually for without it.";

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
    // Bumped from 6000/35000 after a real incident: the page's actual listings render after the
    // filter UI and didn't finish loading in time, so Firecrawl captured a truncated page (cut
    // off right at "Showing 1-20 of 53 results", before any real listing) — the model then
    // fabricated two entirely fake tenders to satisfy the prompt instead of returning empty.
    waitFor: 10000,
    timeout: 40000,
  },
  {
    tenderType: "Kenya Treasury",
    url: "https://www.treasury.go.ke/tenders/",
    prompt: "Extract all tender listings on this Kenya National Treasury page, including title, closing/deadline date, and the full URL or document link for each tender." + FIELD_SUFFIX,
    // Explicit even though it matches the default — self-documents the confirmed convention
    // rather than leaving it to an implicit fallback (see GHANEPS below for the DMY case this
    // guards against).
    dateFormat: "MDY",
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
  {
    tenderType: "GHANEPS",
    // The homepage's "Opened Bid Details" link is bids whose submission window has already
    // closed (past the opening ceremony) — this "Current Tenders" quick-search view is the
    // actually-open, still-accepting-submissions list.
    url: "https://www.ghaneps.gov.gh/epps/quickSearchAction.do?searchSelect=6",
    prompt:
      "Extract all current/open tender listings on this Ghana government e-procurement page, including title, bid submission deadline date, and the full URL linking to each individual tender." +
      FIELD_SUFFIX,
    waitFor: 6000,
    timeout: 35000,
    // Confirmed live: dates are DD/MM/YYYY ("28/08/2026"), not Treasury's MM/DD/YYYY — matters
    // for the rare case where both day and month are ≤12 and the text alone is ambiguous.
    dateFormat: "DMY",
  },
  {
    tenderType: "AfDB",
    // AfDB sits behind a Cloudflare managed challenge that blocks Firecrawl's default proxy
    // outright (confirmed: plain scrape returns a challenge page, stealth proxy gets through).
    // Most notices are in French for francophone West/Central African projects — relevance
    // filtering here does real work since only a fraction will ever match Kenya/Ghana.
    url: "https://www.afdb.org/en/projects-and-operations/procurement",
    prompt: "Extract all procurement notices listed on this African Development Bank page, including title, closing/deadline date if shown, and the full URL linking to each individual notice." + FIELD_SUFFIX,
    waitFor: 8000,
    timeout: 45000,
    proxy: "stealth",
  },
  {
    tenderType: "World Bank",
    // The Bank's own "Procurement Notices" page (/procurement) is a historical archive of
    // ~7,000+ notices per country going back years — /opportunities is the actually-current,
    // still-open list ("643 current opportunities" at last check), with an explicit
    // per-row Country column and Submission Deadline.
    url: "https://projects.worldbank.org/en/projects-operations/opportunities?srce=both",
    prompt:
      "Extract all current procurement opportunities listed on this World Bank page, including title, submission deadline date, and the full URL linking to each individual notice." +
      FIELD_SUFFIX,
    waitFor: 8000,
    timeout: 40000,
  },
  {
    tenderType: "DevelopmentAid",
    // Open to browse without login (only deeper account features are gated) — re-aggregates
    // World Bank/AfDB/UNDP notices (expected, harmless overlap; insertTenderRows already dedupes
    // by source_url/title+date) but also surfaces bilateral/foundation funders with no other
    // source here (GIZ, FSD Africa, KFW, Gates Foundation, ...). locations=32,35,49 is
    // DevelopmentAid's own filter for Ghana/Kenya/Nigeria.
    url: "https://www.developmentaid.org/tenders/search?showAdvancedFilters=1&locations=32,35,49",
    prompt:
      "Extract all tender/procurement listings on this DevelopmentAid page, including title, closing/deadline date, and the full URL linking to each individual tender." + FIELD_SUFFIX,
    waitFor: 6000,
    timeout: 40000,
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
 * silently let irrelevant tenders through undetected.
 *
 * Spelling (organisation/organization, programme/program, ...) and acronym/full-form
 * (PR/"public relations", MEL/"monitoring evaluation and learning", ...) variants are matched
 * interchangeably — a keyword list written in one spelling shouldn't miss a tender that happens
 * to use the other. */
export function matchesKeywords(tender: { title: string; description?: string | null; category?: string | null }, keywords?: string[] | null): boolean {
  const kw = (keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (!kw.length) return true;
  const haystack = normalizeSpellingVariants(`${tender.title} ${tender.description || ""} ${tender.category || ""}`.toLowerCase());
  return kw.some((k) =>
    expandAcronymVariants(k).some((variant) => new RegExp(`\\b${escapeRegExp(normalizeSpellingVariants(variant))}\\b`, "i").test(haystack))
  );
}

/** Deterministic backstop for the country half of `buildRelevanceClause` — confirmed live
 * incident where a global aggregator (World Bank) task scoped to Kenya/Ghana/East+West Africa
 * still returned Cambodia and Zambia tenders, because the prompt clause is only a soft hint the
 * model doesn't reliably enforce (same gap `matchesKeywords` already covers for keywords). Unlike
 * the keyword backstop, this one can be deterministic because `resolveOptionalFields` already
 * normalizes each tender's free-text `location` into a specific canonical country. A tender whose
 * location wasn't recognized as any country is rejected rather than let through — for aggregator
 * sites the location field reliably names one when a task's countries filter matters at all. */
export function matchesCountries(tender: { location?: string | null }, countries?: string[] | null): boolean {
  const cc = (countries || []).map((c) => c.trim()).filter(Boolean);
  if (!cc.length) return true;
  const allowed = new Set(expandCountryFilter(cc).map((c) => c.toLowerCase()));
  const tenderCountry = normalizeCountry(tender.location);
  return tenderCountry !== null && allowed.has(tenderCountry.toLowerCase());
}

/** Anti-fabrication backstop: confirmed live incident where a page's real listings hadn't
 * finished loading when Firecrawl captured it (markdown cut off mid-page, before any actual
 * listing), and the model invented two complete fake tenders — fake org, fake URL, fake date —
 * to satisfy the extraction prompt instead of returning an empty list. This rejects any
 * extracted tender whose title doesn't actually appear (a normalized substring match, tolerant
 * of whitespace/punctuation differences from extraction) anywhere in the markdown that was
 * actually scraped — a real listing's title has to be somewhere on the page it came from. */
export function matchesSourceContent(tender: { title: string }, markdown: string | null): boolean {
  if (!markdown) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const normalizedTitle = normalize(tender.title);
  const normalizedMarkdown = normalize(markdown);
  if (!normalizedTitle) return false;

  // A handful of leading words is enough to confirm the listing is really on the page, without
  // requiring an exact full-title match (extraction sometimes trims trailing punctuation/case).
  const words = normalizedTitle.split(" ");
  const probe = words.slice(0, Math.min(6, words.length)).join(" ");
  return normalizedMarkdown.includes(probe);
}
