import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 30);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("id, task_id, kind, label, status, progress, result_summary, created_at, finished_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { query, engines, taskId } = await req.json();
  if (!query || !Array.isArray(engines) || engines.length === 0) {
    return NextResponse.json({ error: "query and engines are required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ task_id: taskId ?? null, status: "queued", kind: "search-query", label: query })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message ?? "Failed to create job" }, { status: 500 });
  }

  await inngest.send({
    name: "scrape/job.queued",
    data: { jobId: job.id, query, engines },
  });

  return NextResponse.json({ jobId: job.id });
}
