// Organizations occasionally post genuine tender/procurement notices directly on LinkedIn
// (confirmed live: a real Liberia Revenue Authority furniture tender, with a real deadline and a
// real linked PDF). But LinkedIn post search is noisy — the same query phrase mostly surfaces
// unrelated hiring posts, motivational content, even book reviews — so this only treats a post as
// a candidate when its text contains one of a short list of specific procurement phrases (not a
// bare word like "tender", which is far too loose) AND it links out to something off LinkedIn.
//
// LinkedIn wraps every outbound link in an lnkd.in redirect that blocks plain HTTP clients (curl,
// fetch) with a 403 — but Firecrawl renders LinkedIn's own "you're leaving LinkedIn" interstitial
// page just fine, and that page prints the real destination URL in plain text. Resolving through
// Firecrawl (rather than reimplementing redirect-following) reuses infrastructure already proven
// against bot protection elsewhere in this app.
import { extractTenders, type ExtractedTender } from "./firecrawlExtract";
import { FIELD_SUFFIX } from "./sourceConfigs";
import { firecrawlFetch } from "@/shared/lib/firecrawl";

const SEARCH_ACTOR_ID = "harvestapi~linkedin-post-search";
const BASE_URL = "https://api.apify.com/v2";

// The base discovery queries — multi-word phrases only, cuts out the flood of false positives a
// single word like "tender" or "bid" pulls in from hiring posts, generic advice content, and
// unrelated small talk — come from the `linkedin_search_phrases` table (same pattern as
// `search_terms`: DB-managed, not code) via the `seedPhrases` param below, not a constant here.
// They're what makes a post findable as "tender-shaped" at all (the equivalent of a fixed
// source's listing URL). A task's own keywords (below) narrow which of those tenders are worth an
// extraction call, same as every other source's relevance backstop — but on their own they'd be
// too broad to search LinkedIn's entire post firehose with (searching literally "communications"
// would return almost nothing tender-related).

// Looser than the base phrases — single trigger words are normally too noisy on their own
// (see above), but paired with a task's own business keyword as the search query itself (e.g.
// "digital marketing tender"), LinkedIn's own search relevance already does the narrowing, so
// requiring one of these short words in the result is enough of a backstop without needing the
// full multi-word phrase, which would otherwise miss real tenders that just say "RFP" or "bid".
const SHORT_SIGNAL_WORDS = ["tender", "rfp", "rfq", "procurement", "bid"];

// Bounds Apify cost/query volume — a task's keyword list can run to 50+ terms (see the default
// Growthpad keyword set), and searching LinkedIn for every one of them combined with "tender"
// isn't worth the extra spend for the long tail of terms unlikely to appear verbatim in a real
// procurement post's wording.
const MAX_KEYWORD_QUERIES = 6;

// Trailing quote/punctuation/bracket trimmed off — post text sometimes wraps the URL in quotes
// ("...https://lnkd.in/eJqgYNMt\"") and the interstitial page prints it inside a markdown link
// ([url](url)), both of which would otherwise end up baked into the link itself.
const LINK_PATTERN = /https?:\/\/[^\s)\]"'<>]+/g;

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?"')\]]+$/, "");
}

type LinkedInPost = {
  content?: string;
  linkedinUrl?: string;
  author?: { name?: string };
  postedAt?: { date?: string };
  query?: { search?: string };
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesProcurementPhrase(text: string, phrases: string[]): boolean {
  const normalized = text.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase.toLowerCase()));
}

function matchesShortSignal(text: string): boolean {
  return SHORT_SIGNAL_WORDS.some((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text));
}

/** Pulls the link out of a post's text worth following — LinkedIn always wraps outbound links in
 * an lnkd.in redirect, so that's the one to prefer; falls back to any other non-linkedin.com URL
 * (a post could plausibly paste a raw external URL instead of relying on LinkedIn's own link
 * card), then to whatever URL is there at all. */
function extractOutboundLink(text: string): string | null {
  const matches = (text.match(LINK_PATTERN) || []).map(stripTrailingPunctuation);
  return matches.find((url) => url.includes("lnkd.in")) ?? matches.find((url) => !/linkedin\.com/i.test(url)) ?? matches[0] ?? null;
}

/** Resolves an lnkd.in (or any) link to its real destination by reading LinkedIn's own
 * "you're leaving LinkedIn" interstitial page, which Firecrawl can render past the 403 a plain
 * HTTP client gets. Returns null if the link doesn't resolve to anything usable. */
async function resolveOutboundLink(url: string): Promise<string | null> {
  const res = await firecrawlFetch("/v1/scrape", { url, formats: ["markdown"], onlyMainContent: false, waitFor: 3000, timeout: 25000 });
  if (!res.ok) return null;

  const data = await res.json();
  const markdown: string = data?.data?.markdown ?? "";
  // The interstitial links the real destination as a plain markdown link; grab the first one
  // that isn't LinkedIn's own help/domain links.
  const candidates = (markdown.match(LINK_PATTERN) || []).map(stripTrailingPunctuation);
  return candidates.find((u) => !/linkedin\.com/i.test(u)) ?? null;
}

export type LinkedInTenderCandidate = {
  postUrl: string;
  postText: string;
  authorName: string | null;
  postedAt: string | null;
  resolvedUrl: string;
};

/** Searches LinkedIn posts for the given procurement phrases — plus, when a task has its own
 * keywords configured, a handful of `"{keyword} tender"` queries so the search itself leans
 * toward what this task's owner actually cares about, not just generic tender language — and
 * resolves each plausible hit's outbound link. The caller runs the real tender extraction against
 * `resolvedUrl`.
 *
 * Each phrase is its own paid Apify search query, so `seedPhrases` directly controls cost per
 * run — the caller (run-linkedin-tenders-scrape.ts) resolves the actual list from the task's own
 * `linkedin_search_phrases` or, failing that, the `linkedin_search_phrases` table's defaults. */
export async function findLinkedInTenderCandidates(
  keywords: string[] | null | undefined,
  phrases: string[],
  maxPostsPerQuery = 15
): Promise<LinkedInTenderCandidate[]> {
  const keywordQueries = (keywords || [])
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORD_QUERIES)
    .map((k) => `${k} tender`);
  const keywordQuerySet = new Set(keywordQueries);
  const searchQueries = [...phrases, ...keywordQueries];

  const res = await fetch(`${BASE_URL}/acts/${SEARCH_ACTOR_ID}/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchQueries, maxPosts: maxPostsPerQuery, sortBy: "date" }),
  });
  if (!res.ok) throw new Error(`LinkedIn post search failed: ${res.status} ${await res.text()}`);

  const posts: LinkedInPost[] = await res.json();
  const candidates: LinkedInTenderCandidate[] = [];
  const seenUrls = new Set<string>();

  for (const post of posts) {
    const content = post.content || "";
    if (!content) continue;

    // A keyword-combined query already narrowed the subject matter via LinkedIn's own search
    // relevance, so a short trigger word is enough signal; a base discovery query still needs
    // the full phrase to avoid the noise a bare "tender" pulls in on its own (see above).
    const fromKeywordQuery = keywordQuerySet.has(post.query?.search || "");
    const isCandidate = fromKeywordQuery ? matchesShortSignal(content) : matchesProcurementPhrase(content, phrases);
    if (!isCandidate) continue;

    const outboundLink = extractOutboundLink(content);
    if (!outboundLink || seenUrls.has(outboundLink)) continue;
    seenUrls.add(outboundLink);

    const resolvedUrl = await resolveOutboundLink(outboundLink);
    if (!resolvedUrl) continue;

    candidates.push({
      postUrl: post.linkedinUrl || outboundLink,
      postText: content,
      authorName: post.author?.name || null,
      postedAt: post.postedAt?.date || null,
      resolvedUrl,
    });
  }

  return candidates;
}

const EXTRACTION_PROMPT =
  "Extract the tender/procurement notice described on this page, including title, closing/deadline date if stated, and the full URL to any downloadable tender document/attachment." +
  FIELD_SUFFIX;

/** Runs the same structured extraction used for every other fixed source against a candidate's
 * resolved destination page (often a PDF, sometimes a government portal page). Returns null if
 * nothing extractable was found there. */
export async function extractLinkedInTender(candidate: LinkedInTenderCandidate): Promise<{ tender: ExtractedTender; markdown: string | null } | null> {
  const { tenders, markdown } = await extractTenders(candidate.resolvedUrl, EXTRACTION_PROMPT, { timeout: 30000 });
  const tender = tenders[0];
  if (!tender) return null;
  return {
    tender: { ...tender, source_url: tender.source_url || candidate.resolvedUrl },
    markdown,
  };
}
