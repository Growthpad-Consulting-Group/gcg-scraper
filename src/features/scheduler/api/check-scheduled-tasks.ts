import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { startTaskRun } from "./startTaskRun";
import { nextRunAt } from "../lib/frequency";

export function isDue(task: { frequency: string | null; last_run: string | null; run_time?: string | null }): boolean {
  return nextRunAt(task).getTime() <= Date.now();
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
      return supabase
        .from("scheduled_tasks")
        .select("task_id, name, tender_type, search_terms, countries, linkedin_search_phrases, frequency, run_time, last_run")
        .eq("is_enabled", true);
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
