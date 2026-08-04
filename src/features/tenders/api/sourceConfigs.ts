// One entry per tender_type that has a dedicated source (as opposed to "Search Query Tenders",
// which runs a keyword search across generic search engines instead of a single fixed site).
// URLs and target sites ported from the retired Python backend's per-source scrapers.

export type SourceConfig = {
  tenderType: string;
  url: string;
  prompt: string;
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
