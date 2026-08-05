import type { SupabaseClient } from "@supabase/supabase-js";

/** `task_logs` was read by the Scheduler's "View Logs" button but nothing ever wrote to it
 * (legacy table from the retired Python backend). Only logs for task-linked runs — ad-hoc
 * Run Query jobs have no task to attach a log entry to. */
export async function logTaskEvent(supabase: SupabaseClient, taskId: number | string, message: string): Promise<void> {
  const { data: task } = await supabase.from("scheduled_tasks").select("user_id").eq("task_id", taskId).maybeSingle();
  await supabase.from("task_logs").insert({ task_id: taskId, user_id: task?.user_id ?? null, log_entry: message });
}

/** Looks up the job's task_id (not always known at the call site — mark-done/mark-error steps
 * only have jobId) and logs against it. No-op for ad-hoc jobs with no task_id. */
export async function logJobOutcome(supabase: SupabaseClient, jobId: string, message: string): Promise<void> {
  const { data: job } = await supabase.from("scrape_jobs").select("task_id").eq("id", jobId).maybeSingle();
  if (!job?.task_id) return;
  await logTaskEvent(supabase, job.task_id, message);
}
