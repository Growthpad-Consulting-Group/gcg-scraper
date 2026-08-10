// Firecrawl /parse endpoint — converts uploaded local files (PDF, DOCX, XLSX, HTML, etc.)
// into markdown + structured tender extractions. Unlike /scrape which takes a URL, /parse
// accepts raw file bytes via multipart/form-data, making it suitable for documents that aren't
// publicly accessible on the web.

import type { ExtractedTender, ExtractResult } from "./firecrawlExtract";

export type ParseOptions = {
  /** Redact PII from returned markdown. Defaults to false. */
  redactPII?: boolean;
  /** Request timeout in ms. Max 300000. Defaults to 60000. */
  timeout?: number;
  /** PDF-specific parser controls. */
  pdfMode?: "fast" | "auto" | "ocr";
  /** Maximum pages to parse (PDFs only). */
  maxPages?: number;
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
          closing_date: {
            type: "string",
            description: "Deadline/closing date in ISO 8601 format (YYYY-MM-DD) if determinable, otherwise the raw date text",
          },
          source_url: {
            type: "string",
            description: "URL linking to this specific tender/notice, if mentioned in the document",
          },
          description: { type: "string" },
          organization: {
            type: "string",
            description: "The issuing organization/agency/company — the actual issuer named in the document",
          },
          category: {
            type: "string",
            description: "Sector/category, e.g. 'IT', 'Construction', 'Consultancy', 'Supplies' — a short label",
          },
          location: { type: "string", description: "Country or city the tender applies to, if stated" },
          budget: {
            type: "number",
            description: "Estimated value/budget as a plain number (no currency symbol) if stated, otherwise omit",
          },
          document_url: {
            type: "string",
            description: "Direct URL to a downloadable tender document/PDF if referenced in the content",
          },
        },
        required: ["title"],
      },
    },
  },
  required: ["tenders"],
};

const EXTRACTION_PROMPT =
  "This is a procurement or business document. Extract every tender, RFP, RFQ, contract notice, or procurement opportunity mentioned. For each one, capture its title, issuing organization, closing/deadline date, location, budget/value if stated, a short category label, the URL of the listing if linked, and the URL of any downloadable document if linked. If no tenders are found, return an empty list.";

/**
 * Parse a local document file using Firecrawl's /v1/parse endpoint and extract structured
 * tender data from it. Returns the same ExtractResult shape as extractTenders() so downstream
 * Inngest steps and DB helpers work identically regardless of source type.
 */
export async function parseDocument(file: File | Blob, fileName: string, options?: ParseOptions): Promise<ExtractResult> {
  const parseOptions: Record<string, unknown> = {
    formats: ["markdown", "json"],
    json: { schema: EXTRACTION_SCHEMA, prompt: EXTRACTION_PROMPT },
    onlyMainContent: false,
    timeout: options?.timeout ?? 60_000,
    ...(options?.redactPII ? { redactPII: true } : {}),
    ...(options?.pdfMode || options?.maxPages
      ? {
          parsers: {
            type: "pdf",
            ...(options.pdfMode ? { mode: options.pdfMode } : {}),
            ...(options.maxPages ? { maxPages: options.maxPages } : {}),
          },
        }
      : {}),
  };

  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("options", JSON.stringify(parseOptions));

  const res = await fetch("https://api.firecrawl.dev/v1/parse", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Firecrawl parse failed for "${fileName}": ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const tenders: ExtractedTender[] = Array.isArray(body?.data?.json?.tenders) ? body.data.json.tenders : [];
  const markdown: string | null = typeof body?.data?.markdown === "string" ? body.data.markdown : null;

  return { tenders, markdown };
}
