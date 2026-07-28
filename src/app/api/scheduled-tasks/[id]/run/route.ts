import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: task, error: fetchError } = await supabase.from("scheduled_tasks").select("*").eq("task_id", id).maybeSingle();
  if (fetchError || !task) return NextResponse.json({ error: fetchError?.message || "Task not found" }, { status: 404 });

  const { data: job, error } = await supabase.from("scrape_jobs").insert({ task_id: id, status: "queued" }).select("id").single();
  if (error || !job) return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 });

  const currentYear = new Date().getFullYear();
  const query = `${currentYear} ${(task.search_terms || []).join(" ")}`.trim();

  await inngest.send({ name: "scrape/job.queued", data: { jobId: job.id, query, engines: task.engines || ["Bing"] } });
  await supabase.from("scheduled_tasks").update({ last_run: new Date().toISOString() }).eq("task_id", id);

  return NextResponse.json({ scraping_task_id: job.id });
}
