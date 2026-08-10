import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { startTaskRun } from "./startTaskRun";

// "Every 3 Hours" / "Every 12 Hours" match the options TaskForm actually offers.
const FREQUENCY_MS: Record<string, number> = {
  Hourly: 60 * 60 * 1000,
  "Every 3 Hours": 3 * 60 * 60 * 1000,
  "Every 12 Hours": 12 * 60 * 60 * 1000,
  Daily: 24 * 60 * 60 * 1000,
  Weekly: 7 * 24 * 60 * 60 * 1000,
  Monthly: 30 * 24 * 60 * 60 * 1000,
};
const DEFAULT_INTERVAL_MS = FREQUENCY_MS.Daily;

export function isDue(task: { frequency: string | null; last_run: string | null }): boolean {
  if (!task.last_run) return true; // never run ⇒ due immediately
  const intervalMs = (task.frequency ? FREQUENCY_MS[task.frequency] : undefined) ?? DEFAULT_INTERVAL_MS;
  return Date.now() - new Date(task.last_run).getTime() >= intervalMs;
}

/**
 * The only thing that makes "Scheduler" actually schedule anything — previously `frequency` was
 * stored and displayed but nothing ever read it. Runs every 15 minutes, starts any enabled task
 * whose interval has elapsed since its last_run.
 */
export const checkScheduledTasksJob = inngest.createFunction(
  { id: "check-scheduled-tasks", retries: 0, triggers: { cron: "*/15 * * * *" } },
  async ({ step }) => {
    const supabase = createServerSupabaseClient();

    const { data: tasks, error } = await step.run("fetch-enabled-tasks", async () => {
      return supabase.from("scheduled_tasks").select("task_id, name, tender_type, search_terms, countries, frequency, last_run").eq("is_enabled", true);
    });
    if (error) throw error;

    const due = (tasks || []).filter(isDue);

    let started = 0;
    for (const task of due) {
      await step.run(`start-task-${task.task_id}`, async () => {
        await startTaskRun(supabase, task);
      });
      started += 1;
    }

    return { checked: (tasks || []).length, started };
  }
);
