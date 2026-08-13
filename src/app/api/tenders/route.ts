import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

// `raw_content` is a full scraped-page markdown dump (often tens of KB) — only ever shown for one
// row at a time via the inline expand panel's "raw" tab, fetched lazily from /api/tenders/[id]
// when that row is actually expanded. Pulling it for all 500 rows on every list load was easily
// the single biggest driver of Vercel origin data transfer for this app, for data almost never
// looked at.
const LIST_COLUMNS =
  "id,title,description,closing_date,source_url,status,scraped_at,format,tender_type,budget,currency,location,country,organization,category,document_url,job_id,document_checked_at,reminder_sent_at,created_at,updated_at";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  const jobId = req.nextUrl.searchParams.get("job")?.trim();
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

  const { data: tenders, error, count } = await request;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenders, total: count ?? tenders?.length ?? 0, limit, offset });
}
