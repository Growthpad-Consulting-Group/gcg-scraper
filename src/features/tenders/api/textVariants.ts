// Keyword matching is a literal substring check (see matchesKeywords/matchesProcurementPhrase) —
// exact by design, so buyers who write "programme" instead of "program", or "MEL" instead of
// "monitoring evaluation and learning", would otherwise silently fall outside a keyword list that
// only spells it one way. From GCG's keyword library doc: British/American spelling pairs and
// acronym/full-form pairs buyers use interchangeably.

// Single-word (or short-phrase) spelling pairs — safe to substitute anywhere they appear inside a
// longer keyword or phrase, since both sides always mean the same word.
const SPELLING_VARIANT_PAIRS: [string, string][] = [
  ["organisation", "organization"],
  ["programme", "program"],
  ["behaviour", "behavior"],
  ["optimisation", "optimization"],
  ["localisation", "localization"],
  ["visualisation", "visualization"],
  ["centre", "center"],
  ["e-commerce", "ecommerce"],
  ["e-learning", "elearning"],
  ["website", "web site"],
  ["multi-country", "multicountry"],
  ["non-profit", "nonprofit"],
];

// Acronym/full-form pairs — not a text substitution (different lengths/structure), so these are
// treated as alternate whole-term spellings of the same concept instead: if a keyword equals
// either side, the other side is checked too.
const ACRONYM_VARIANT_PAIRS: [string, string][] = [
  ["monitoring and evaluation", "M&E"],
  ["monitoring evaluation accountability and learning", "MEAL"],
  ["monitoring evaluation and learning", "MEL"],
  ["social and behaviour change communication", "SBCC"],
  ["public relations", "PR"],
  ["search engine optimisation", "SEO"],
  ["search engine marketing", "SEM"],
  ["answer engine optimisation", "AEO"],
  ["generative engine optimisation", "GEO"],
  ["learning management system", "LMS"],
  ["customer relationship management", "CRM"],
  ["business process outsourcing", "BPO"],
  ["employer of record", "EOR"],
  ["sales development representative", "SDR"],
  ["terms of reference", "TOR"],
  ["expression of interest", "EOI"],
  ["request for proposal", "RFP"],
  ["request for quotation", "RFQ"],
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Canonicalizes both sides of a spelling pair to the same form (always the first/British form
 * here — the choice is arbitrary, what matters is both the keyword and the haystack go through
 * the same canonicalization before matching, so it doesn't matter which side originally used
 * which spelling). Safe to run on arbitrary free text, not just single keywords. */
export function normalizeSpellingVariants(text: string): string {
  let result = text;
  for (const [canonical, variant] of SPELLING_VARIANT_PAIRS) {
    result = result.replace(new RegExp(`\\b${escapeRegExp(variant)}\\b`, "gi"), canonical);
  }
  return result;
}

/** A keyword/phrase's acronym-equivalent forms, if any — e.g. "public relations" also returns
 * "PR", and "PR" also returns "public relations". Always includes the original term itself. */
export function expandAcronymVariants(term: string): string[] {
  const normalized = term.trim().toLowerCase();
  const variants = new Set([term]);
  for (const [full, acronym] of ACRONYM_VARIANT_PAIRS) {
    if (normalized === full.toLowerCase()) variants.add(acronym);
    if (normalized === acronym.toLowerCase()) variants.add(full);
  }
  return [...variants];
}
