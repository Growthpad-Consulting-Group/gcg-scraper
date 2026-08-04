import type { SupabaseClient } from "@supabase/supabase-js";
import { inngest } from "@/features/scraping/api/inngest-client";
import { getSourceConfig } from "@/features/tenders/api/sourceConfigs";

export interface ScheduledTaskRow {
  task_id: number;
  name: string | null;
  tender_type: string | null;
  search_terms: string[] | null;
}

/** Shared by the manual "Run Task" button and the cron trigger — one place that decides which
 * scrape flow a task's `tender_type` maps to and kicks it off. */
export async function startTaskRun(supabase: SupabaseClient, task: ScheduledTaskRow): Promise<string> {
  const tenderType = task.tender_type ?? undefined;
  const kind = tenderType === "Website Tenders" ? "tender-website" : tenderType && getSourceConfig(tenderType) ? "tender-source" : "search-query";

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ task_id: task.task_id, status: "queued", kind, label: task.name ?? tenderType ?? "Scheduled run" })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message || "Failed to create job");

  if (tenderType === "Website Tenders") {
    await inngest.send({ name: "tenders/website.queued", data: { jobId: job.id } });
  } else if (tenderType && getSourceConfig(tenderType)) {
    await inngest.send({ name: "tenders/source.queued", data: { jobId: job.id, tenderType } });
  } else {
    const currentYear = new Date().getFullYear();
    const query = `${currentYear} ${(task.search_terms || []).join(" ")}`.trim();
    await inngest.send({ name: "scrape/job.queued", data: { jobId: job.id, query } });
  }

  await supabase.from("scheduled_tasks").update({ last_run: new Date().toISOString() }).eq("task_id", task.task_id);

  return job.id;
}
