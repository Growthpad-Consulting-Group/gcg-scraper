import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(req.url);

  const reason      = searchParams.get("reason");
  const tenderType  = searchParams.get("tender_type");
  const jobId       = searchParams.get("job_id");
  const search      = searchParams.get("q");
  const dateFrom    = searchParams.get("date_from");
  const dateTo      = searchParams.get("date_to");
  const limit       = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset      = Number(searchParams.get("offset") ?? "0");

  let query = supabase
    .from("rejected_tenders")
    .select("id, job_id, tender_type, title, source_url, organization, category, location, reason, rejected_at", { count: "exact" })
    .order("rejected_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (jobId)      query = query.eq("job_id", jobId);
  if (reason)     query = query.eq("reason", reason);
  if (tenderType) query = query.eq("tender_type", tenderType);
  if (search)     query = query.ilike("title", `%${search}%`);
  if (dateFrom)   query = query.gte("rejected_at", dateFrom);
  if (dateTo)     query = query.lte("rejected_at", dateTo);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rejected: data ?? [], total: count ?? 0 });
}
