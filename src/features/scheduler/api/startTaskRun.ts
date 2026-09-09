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
  linkedin_search_phrases?: string[] | null;
}

const LEAD_TASK_KINDS: Record<string, string> = {
  "Google Maps Leads": "gmb-leads",
  "LinkedIn People Leads": "linkedin-leads",
  "Reddit Mentions": "reddit-leads",
};

/** Shared by the manual "Run Task" button and the cron trigger — one place that decides which
 * scrape flow a task's `tender_type` maps to and kicks it off. */
export async function startTaskRun(supabase: SupabaseClient, task: ScheduledTaskRow): Promise<string> {
  const tenderType = task.tender_type ?? undefined;
  const kind =
    tenderType === "Website Tenders"
      ? "tender-website"
      : tenderType === "LinkedIn Tenders"
        ? "tender-source"
        : tenderType && LEAD_TASK_KINDS[tenderType]
          ? LEAD_TASK_KINDS[tenderType]
          : tenderType && getSourceConfig(tenderType)
            ? "tender-source"
            : "search-query";

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ task_id: task.task_id, status: "queued", kind, label: task.name ?? tenderType ?? "Scheduled run" })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message || "Failed to create job");

  if (tenderType === "Google Maps Leads") {
    await inngest.send({
      name: "leads/gmb.queued",
      data: { jobId: job.id, searchTerm: task.search_terms?.[0] || task.name || "", location: task.countries?.[0] || "" },
    });
  } else if (tenderType === "LinkedIn People Leads") {
    await inngest.send({
      name: "leads/linkedin.queued",
      data: { jobId: job.id, searchQuery: task.search_terms?.[0] || task.name || "", locations: task.countries || [] },
    });
  } else if (tenderType === "Reddit Mentions") {
    await inngest.send({
      name: "leads/reddit.queued",
      data: { jobId: job.id, searchQuery: task.search_terms?.[0] || task.name || "" },
    });
  } else if (tenderType === "Website Tenders") {
    await inngest.send({
      name: "tenders/website.queued",
      data: { jobId: job.id, keywords: task.search_terms || [], countries: task.countries || [] },
    });
  } else if (tenderType === "LinkedIn Tenders") {
    await inngest.send({
      name: "tenders/linkedin-tenders.queued",
      data: { jobId: job.id, keywords: task.search_terms || [], countries: task.countries || [], searchPhrases: task.linkedin_search_phrases || [] },
    });
  } else if (tenderType && getSourceConfig(tenderType)) {
    await inngest.send({
      name: "tenders/source.queued",
      data: { jobId: job.id, tenderType, keywords: task.search_terms || [], countries: task.countries || [] },
    });
  } else {
    // Each selected term gets searched separately (see run-scrape.ts) rather than joined into
    // one combined string — a search engine can't usefully match "term1 term2 term3" as a bag
    // of unrelated phrases the way a human reads a task's term list.
    //
    // Terms are sent as-is now, not appended with year/countries — confirmed live that doing so
    // broke the curated quoted-phrase queries (e.g. GCG's keyword library queries already end in
    // "Kenya" or "East Africa" as appropriate; piling on "2026 ... Kenya Kenya Ghana East Africa
    // West Africa" made the query over-constrained and returned zero results). Country scoping
    // is now a deterministic post-extraction backstop in run-scrape.ts instead (matchesCountries,
    // same pattern every other source already uses) rather than a soft keyword baked into the
    // query text, which never actually constrained results to begin with (confirmed live: a task
    // scoped to Kenya/Ghana/East+West Africa still returned genuine Equatorial Guinea/Europe/
    // Global tenders, since a page merely mentioning "Kenya" in passing still matches).
    await inngest.send({ name: "scrape/job.queued", data: { jobId: job.id, queries: task.search_terms || [], countries: task.countries || [] } });
  }

  await supabase.from("scheduled_tasks").update({ last_run: new Date().toISOString() }).eq("task_id", task.task_id);
  await logTaskEvent(supabase, task.task_id, `Run started (job ${job.id}).`);

  return job.id;
}
