import type { SupabaseClient } from "@supabase/supabase-js";
import { inngest } from "@/features/scraping/api/inngest-client";
import { getSourceConfig } from "@/features/tenders/api/sourceConfigs";
import { logTaskEvent } from "./taskLog";

export interface ScheduledTaskRow {
  task_id: number;
  name: string | null;
  tender_type: string | null;
  search_terms: string[] | null;
  countries: string[] | null;
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
    await inngest.send({
      name: "tenders/website.queued",
      data: { jobId: job.id, keywords: task.search_terms || [], countries: task.countries || [] },
    });
  } else if (tenderType && getSourceConfig(tenderType)) {
    await inngest.send({
      name: "tenders/source.queued",
      data: { jobId: job.id, tenderType, keywords: task.search_terms || [], countries: task.countries || [] },
    });
  } else {
    // Each selected term gets searched separately (see run-scrape.ts) rather than joined into
    // one combined string — a search engine can't usefully match "term1 term2 term3" as a bag
    // of unrelated phrases the way a human reads a task's term list. Countries are appended as
    // extra keywords on each term's own query (not cross-multiplied into a separate search per
    // country) — same intent as "digital marketing tender Kenya" typed into a search box,
    // without multiplying the already-per-term search count.
    const currentYear = new Date().getFullYear();
    const queries = (task.search_terms || []).map((term) => [currentYear, term, ...(task.countries || [])].join(" ").trim());
    await inngest.send({ name: "scrape/job.queued", data: { jobId: job.id, queries } });
  }

  await supabase.from("scheduled_tasks").update({ last_run: new Date().toISOString() }).eq("task_id", task.task_id);
  await logTaskEvent(supabase, task.task_id, `Run started (job ${job.id}).`);

  return job.id;
}
