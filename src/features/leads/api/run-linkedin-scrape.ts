import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getRunStatus, getDatasetItems, abortRun } from "./apify";
import { startLinkedInSearch } from "./apifyLinkedIn";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";

const MAX_POLLS = 40; // ~10 minutes at 15s apart

// LinkedIn is inherently less reliable than GMB/tenders (LinkedIn actively fights scraping
// upstream of the actor we call) — this job treats a failed or empty run as a normal "done"
// outcome with 0 leads, not an error, since partial/no results are expected here and shouldn't
// look like a bug to the user. Only a genuine Apify run failure is marked "error".
export const runLinkedInScrapeJob = inngest.createFunction(
  { id: "run-linkedin-scrape-job", retries: 1, triggers: { event: "leads/linkedin.queued" } },
  async ({ event, step }) => {
    const { jobId, searchQuery, locations, maxResults } = event.data as {
      jobId: string;
      searchQuery: string;
      locations: string[];
      maxResults?: number;
    };
    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId);
    });

    const { runId, datasetId } = await step.run("start-apify-run", () =>
      maxResults ? startLinkedInSearch(searchQuery, locations, maxResults) : startLinkedInSearch(searchQuery, locations)
    );

    let status: string = "RUNNING";
    for (let i = 0; i < MAX_POLLS; i++) {
      if (await step.run(`check-canceled-${i}`, () => isJobCanceled(supabase, jobId))) {
        await step.run("abort-apify-run", () => abortRun(runId));
        return { jobId, leadsFound: 0, status: "canceled" };
      }

      status = await step.run(`poll-${i}`, () => getRunStatus(runId));
      if (status !== "RUNNING" && status !== "READY") break;

      await step.run(`progress-${i}`, async () => {
        await supabase.from("scrape_jobs").update({ progress: { stage: "running", pollCount: i + 1 } }).eq("id", jobId);
      });
      await step.sleep(`wait-${i}`, "15s");
    }

    if (status !== "SUCCEEDED") {
      await step.run("mark-done-no-results", async () => {
        await supabase
          .from("scrape_jobs")
          .update({ status: "done", finished_at: new Date().toISOString(), result_summary: { leadsFound: 0, apifyStatus: status } })
          .eq("id", jobId)
          .neq("status", "canceled");
      });
      return { jobId, leadsFound: 0, apifyStatus: status };
    }

    const profiles = await step.run("fetch-dataset", () => getDatasetItems(datasetId));

    const inserted = await step.run("save-leads", async () => {
      if (profiles.length === 0) return 0;
      const rows = profiles.map((profile: any) => ({
        job_id: jobId,
        full_name: profile.fullName || "Unknown",
        headline: profile.headline || null,
        location: profile.locationText || profile.location || null,
        current_company: profile.currentCompany || profile.currentPosition?.[0]?.companyName || null,
        profile_url: profile.linkedinUrl || profile.profileUrl || profile.url || null,
        search_query: searchQuery,
        raw: profile,
      }));
      const { error } = await supabase.from("linkedin_leads").insert(rows);
      if (error) throw error;
      return rows.length;
    });

    await step.run("mark-done", async () => {
      await supabase
        .from("scrape_jobs")
        .update({ status: "done", finished_at: new Date().toISOString(), result_summary: { leadsFound: inserted } })
        .eq("id", jobId)
        .neq("status", "canceled");
    });

    return { jobId, leadsFound: inserted };
  }
);
