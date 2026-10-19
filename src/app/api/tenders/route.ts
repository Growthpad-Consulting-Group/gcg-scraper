import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { normalizeCountry } from "@/features/tenders/api/countries";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

// `raw_content` is a full scraped-page markdown dump (often tens of KB) — only ever shown for one
// row at a time via the inline expand panel's "raw" tab, fetched lazily from /api/tenders/[id]
// when that row is actually expanded. Pulling it for all 500 rows on every list load was easily
// the single biggest driver of Vercel origin data transfer for this app, for data almost never
// looked at.
// pursuit_notes is excluded the same way raw_content is — only ever shown for the one row
// expanded/opened, fetched lazily from /api/tenders/[id] rather than for all 500 rows up front.
const LIST_COLUMNS =
  "id,title,description,closing_date,source_url,status,scraped_at,format,tender_type,budget,currency,location,country,organization,category,document_url,job_id,document_checked_at,reminder_sent_at,created_at,updated_at,pursuit_status,assigned_to,matched_keywords,sectors,languages,eligibility,attachments,bid_submitted_at,bid_value";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  const jobId = req.nextUrl.searchParams.get("job")?.trim();
  const source = req.nextUrl.searchParams.get("source")?.trim();
  const limitParam = Number(req.nextUrl.searchParams.get("limit"));
  const offsetParam = Number(req.nextUrl.searchParams.get("offset"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  const supabase = createServerSupabaseClient();

  let request = supabase
    .from("tenders")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("scraped_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (query) {
    request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (jobId) {
    request = request.eq("job_id", jobId);
  }
  // "Which tenders came from this specific website source" — Website Sources' per-row count has
  // no direct FK to key off (tenders don't record which `websites` row they were scraped from),
  // so this matches on hostname appearing in source_url instead, same as tenders_count itself.
  if (source) {
    request = request.ilike("source_url", `%${source}%`);
  }

  const { data: tenders, error, count } = await request;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenders, total: count ?? tenders?.length ?? 0, limit, offset });
}

// POST /api/tenders — manually add a tender that wasn't scraped automatically.
// Uses `tender_type = "Manual"` so it's distinguishable in filters and the source breakdown chart.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, organization, source_url, closing_date, location, category, description, tender_type } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const closingDateValue: string = closing_date?.trim() || "9999-12-31";
  const closingDateObj = new Date(closingDateValue);
  const status: "open" | "closed" = !isNaN(closingDateObj.getTime()) && closingDateObj < new Date() ? "closed" : "open";
  const locationTrimmed = location?.trim().slice(0, 100) || null;

  const { data, error } = await supabase
    .from("tenders")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      closing_date: closingDateValue,
      source_url: source_url?.trim() || `manual:${Date.now()}`,
      status,
      tender_type: tender_type?.trim() || "Manual",
      format: source_url?.trim().toLowerCase().endsWith(".pdf") ? "PDF" : "HTML",
      scraped_at: new Date().toISOString(),
      organization: organization?.trim() || null,
      category: category?.trim() || null,
      location: locationTrimmed,
      country: normalizeCountry(locationTrimmed),
      budget: null,
      currency: null,
      document_url: null,
      raw_content: null,
      job_id: null,
      matched_keywords: null,
      sectors: null,
      languages: null,
      eligibility: null,
      attachments: null,
    })
    .select("id, title, closing_date, status, organization, location, category")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A tender with this source URL already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tender: data }, { status: 201 });
}
