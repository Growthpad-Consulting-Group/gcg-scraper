import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchQuery, location } = await req.json();
  if (!searchQuery) return NextResponse.json({ error: "searchQuery is required" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ status: "queued", kind: "linkedin-leads", label: location ? `${searchQuery} · ${location}` : searchQuery })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 });

  await inngest.send({ name: "leads/linkedin.queued", data: { jobId: job.id, searchQuery, locations: location ? [location] : [] } });

  return NextResponse.json({ jobId: job.id });
}
