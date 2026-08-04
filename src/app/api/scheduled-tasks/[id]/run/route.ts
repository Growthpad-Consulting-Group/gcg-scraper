import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { startTaskRun } from "@/features/scheduler/api/startTaskRun";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: task, error: fetchError } = await supabase.from("scheduled_tasks").select("*").eq("task_id", id).maybeSingle();
  if (fetchError || !task) return NextResponse.json({ error: fetchError?.message || "Task not found" }, { status: 404 });

  try {
    const jobId = await startTaskRun(supabase, task);
    return NextResponse.json({ scraping_task_id: jobId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
