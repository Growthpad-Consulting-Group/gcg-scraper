import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Notifications were previously pure UI — nothing ever inserted a row. Called from each scrape
 * flow's mark-done step; only fires for scheduled (task-linked) runs, since ad-hoc Run Query users
 * are already watching the live console and don't need a notification for their own action.
 */
export async function notifyTaskOwner(supabase: SupabaseClient, jobId: string, tendersFound: number): Promise<void> {
  if (tendersFound <= 0) return;

  const { data: job } = await supabase.from("scrape_jobs").select("task_id, label").eq("id", jobId).maybeSingle();
  if (!job?.task_id) return;

  const { data: task } = await supabase.from("scheduled_tasks").select("user_id, name").eq("task_id", job.task_id).maybeSingle();
  if (!task?.user_id) return;

  const label = task.name || job.label || "Scheduled task";
  const message = `"${label}" found ${tendersFound} new tender${tendersFound === 1 ? "" : "s"}.`;

  await supabase.from("notifications").insert({ user_id: task.user_id, message, read: false });
}
