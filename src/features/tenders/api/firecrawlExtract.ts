// Structured tender extraction via Firecrawl, replacing the old Python backend's per-source
// Selenium + BeautifulSoup scrapers. Firecrawl handles JS rendering itself and returns
// already-structured data, so there's no need to hand-maintain CSS selectors per site.

export type ExtractedTender = {
  title: string;
  closing_date: string | null;
  source_url: string | null;
  description?: string | null;
};

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    tenders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          closing_date: { type: "string", description: "Deadline/closing date in ISO 8601 format (YYYY-MM-DD) if determinable, otherwise the raw date text" },
          source_url: { type: "string", description: "Full absolute URL linking to this specific tender/notice" },
          description: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  required: ["tenders"],
};

export async function extractTenders(url: string, prompt: string): Promise<ExtractedTender[]> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["extract"],
      extract: { schema: EXTRACTION_SCHEMA, prompt },
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl extract failed for ${url}: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const tenders = body?.data?.extract?.tenders;
  return Array.isArray(tenders) ? tenders : [];
}
