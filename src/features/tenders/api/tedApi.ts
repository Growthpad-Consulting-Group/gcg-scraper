// TED (Tenders Electronic Daily) — the EU's official public procurement journal. Free, no auth,
// documented Expert Query language: https://docs.ted.europa.eu/. Used instead of scraping ted.europa.eu
// itself (a heavy Angular SPA) — same reasoning as PPIP/ReliefWeb moving off their scraped pages
// onto a real API: structured fields, no risk of the model fabricating a listing.
//
// Confirmed live: `place-of-performance IN (...)` is the field that actually surfaces
// Africa-relevant work — `buyer-country` is the *funder's* country (Germany, Denmark, Belgium,
// ...), not where the contract is delivered, so filtering on that would miss almost everything
// GCG could bid on. A first real hit while testing this: "Kenya – Technical assistance services
// – Promoting the EU-Kenya Partnership through strategic communications."
import type { ExtractedTender } from "./firecrawlExtract";

// TED's ISO 3166-1 alpha-3 place-of-performance codes for GCG's current target markets, mapped to
// the country name countries.ts's normalizeCountry() recognizes (see countries.ts's
// WORLD_COUNTRIES — kept as a small local map here since TED needs alpha-3 and
// shared/lib/countryCodes.ts is conventionally alpha-2).
const TARGET_COUNTRIES: Record<string, string> = {
  KEN: "Kenya",
  GHA: "Ghana",
  UGA: "Uganda",
  RWA: "Rwanda",
  ZMB: "Zambia",
  ETH: "Ethiopia",
};
const TARGET_COUNTRY_CODES = Object.keys(TARGET_COUNTRIES);

const FIELDS = ["publication-number", "notice-title", "buyer-name", "deadline-receipt-request", "publication-date", "place-of-performance"];

type TedNotice = {
  "publication-number": string;
  "notice-title"?: Record<string, string[] | string>;
  "buyer-name"?: Record<string, string[] | string>;
  "deadline-receipt-request"?: string[];
  "publication-date"?: string;
  "place-of-performance"?: string[];
};

type TedSearchResponse = {
  notices?: TedNotice[];
  totalNoticeCount?: number;
  message?: string;
};

/** TED's per-field values are keyed by ISO 639 language code (whichever languages the buyer
 * published in) rather than a single string — prefers English, falls back to whatever's there. */
function pickText(field: Record<string, string[] | string> | undefined): string | null {
  if (!field) return null;
  const value = field.eng ?? Object.values(field)[0];
  if (!value) return null;
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() || null;
}

export async function fetchTedTenders(daysBack = 30): Promise<{ tenders: ExtractedTender[]; markdown: string }> {
  const countryList = TARGET_COUNTRY_CODES.join(", ");
  const query = `place-of-performance IN (${countryList}) AND publication-date >= today(-${daysBack})`;

  const res = await fetch("https://api.ted.europa.eu/v3/notices/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, fields: FIELDS, limit: 250 }),
  });
  if (!res.ok) throw new Error(`TED API failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as TedSearchResponse;
  if (data.message) throw new Error(`TED API error: ${data.message}`);
  const notices = data.notices ?? [];

  const tenders: ExtractedTender[] = notices.map((n) => ({
    title: pickText(n["notice-title"]) || `TED notice ${n["publication-number"]}`,
    // A deadline-less notice (PIN/early-engagement stage) is legitimately open-ended, not
    // missing data — resolveClosingDate's NO_DEADLINE_SENTINEL handles a null the same way
    // every other source's undated tender is handled.
    closing_date: n["deadline-receipt-request"]?.[0] ?? null,
    // Confirmed live: the plain `/en/notice/{id}` path 404s — `/en/notice/{id}/html` is TED's
    // actual working notice-detail URL (the `/-/detail/{id}` form from `links.html` also exists
    // but only 202s, i.e. still redirecting/rendering, not a stable direct link).
    source_url: `https://ted.europa.eu/en/notice/${n["publication-number"]}/html`,
    organization: pickText(n["buyer-name"]),
    description: null,
    category: null,
    // A notice can span several countries (regional programmes) — the query already guarantees
    // at least one of TARGET_COUNTRIES is among them; the first match becomes the recorded
    // location (matchesCountries' downstream check then narrows to the task's own countries).
    location: TARGET_COUNTRIES[(n["place-of-performance"] ?? []).find((c) => c in TARGET_COUNTRIES) ?? ""] ?? null,
    budget: null,
    document_url: null,
  }));

  // Same ground-truth-markdown approach as ppipApi.ts/reliefwebApi.ts: matchesSourceContent's
  // anti-fabrication check expects title+organization to appear in "the page" — synthesized here
  // since these come from a real API response, not an LLM guess off scraped HTML.
  const markdown = notices.map((n) => `${pickText(n["notice-title"]) ?? ""} ${pickText(n["buyer-name"]) ?? ""}`).join("\n");

  return { tenders, markdown };
}
