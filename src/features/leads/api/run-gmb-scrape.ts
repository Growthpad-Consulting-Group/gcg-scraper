import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { startGoogleMapsRun, getRunStatus, getDatasetItems, abortRun } from "./apify";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";

const MAX_POLLS = 40; // ~10 minutes at 15s apart, generous for an Apify Google Maps run

export const runGmbScrapeJob = inngest.createFunction(
  { id: "run-gmb-scrape-job", retries: 1, triggers: { event: "leads/gmb.queued" } },
  async ({ event, step }) => {
    const { jobId, searchTerm, location, maxResults } = event.data as { jobId: string; searchTerm: string; location: string; maxResults?: number };
    const supabase = createServerSupabaseClient();
    const searchString = location ? `${searchTerm} in ${location}` : searchTerm;

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId);
    });

    const { runId, datasetId } = await step.run("start-apify-run", () =>
      maxResults ? startGoogleMapsRun(searchString, maxResults) : startGoogleMapsRun(searchString)
    );

    let status: string = "RUNNING";
    for (let i = 0; i < MAX_POLLS; i++) {
      if (await step.run(`check-canceled-${i}`, () => isJobCanceled(supabase, jobId))) {
        await step.run("abort-apify-run", () => abortRun(runId));
        return { jobId, status: "canceled" };
      }

      status = await step.run(`poll-${i}`, () => getRunStatus(runId));
      if (status !== "RUNNING" && status !== "READY") break;

      await step.run(`progress-${i}`, async () => {
        await supabase.from("scrape_jobs").update({ progress: { stage: "running", pollCount: i + 1 } }).eq("id", jobId);
      });
      await step.sleep(`wait-${i}`, "15s");
    }

    if (status !== "SUCCEEDED") {
      await step.run("mark-error", async () => {
        await supabase
          .from("scrape_jobs")
          .update({ status: "error", finished_at: new Date().toISOString(), result_summary: { apifyStatus: status } })
          .eq("id", jobId)
          .neq("status", "canceled");
      });
      return { jobId, status };
    }

    const places = await step.run("fetch-dataset", () => getDatasetItems(datasetId));

    const inserted = await step.run("save-leads", async () => {
      if (places.length === 0) return 0;
      const rows = places.map((place) => ({
        job_id: jobId,
        source: "google_maps",
        business_name: place.title || "Unknown",
        category: place.categoryName || null,
        address: place.address || null,
        location,
        phone: place.phone || null,
        website: place.website || null,
        email: place.emails?.[0] || null,
        contact_name: place.leadsEnrichment?.[0]?.fullName || null,
        contact_email: place.leadsEnrichment?.[0]?.email || null,
        contact_phone: place.leadsEnrichment?.[0]?.mobileNumber || null,
        contact_linkedin: place.leadsEnrichment?.[0]?.linkedinProfile || null,
        contacts: place.leadsEnrichment?.length ? place.leadsEnrichment : null,
        rating: place.totalScore ?? null,
        reviews_count: place.reviewsCount ?? null,
        search_query: searchString,
        raw: place,
      }));
      const { error } = await supabase.from("leads").insert(rows);
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
