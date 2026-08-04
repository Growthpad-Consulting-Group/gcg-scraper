import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchTerm, location } = await req.json();
  if (!searchTerm) return NextResponse.json({ error: "searchTerm is required" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ status: "queued", kind: "gmb-leads", label: location ? `${searchTerm} · ${location}` : searchTerm })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 });

  await inngest.send({ name: "leads/gmb.queued", data: { jobId: job.id, searchTerm, location: location || "" } });

  return NextResponse.json({ jobId: job.id });
}
