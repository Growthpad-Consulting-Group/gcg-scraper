import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  const jobId = req.nextUrl.searchParams.get("job")?.trim();
  const supabase = createServerSupabaseClient();

  let request = supabase.from("reddit_leads").select("*").order("created_at", { ascending: false });
  if (query) {
    request = request.or(`title.ilike.%${query}%,subreddit.ilike.%${query}%,author.ilike.%${query}%`);
  }
  if (jobId) {
    request = request.eq("job_id", jobId);
  }

  const { data: leads, error } = await request;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads });
}
