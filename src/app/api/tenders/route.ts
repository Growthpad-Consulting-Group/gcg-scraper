import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

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
    .select("*", { count: "exact" })
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
