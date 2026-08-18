import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { startGoogleMapsRun, getRunStatus, getDatasetItems, abortRun } from "./apify";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";
import { extractCountryCode } from "@/shared/lib/countryCodes";

const MAX_POLLS = 40; // ~10 minutes at 15s apart, generous for an Apify Google Maps run

export const runGmbScrapeJob = inngest.createFunction(
  { id: "run-gmb-scrape-job", retries: 1, triggers: { event: "leads/gmb.queued" } },
  async ({ event, step }) => {
    const { jobId, searchTerm, location, maxResults } = event.data as { jobId: string; searchTerm: string; location: string; maxResults?: number };
    const supabase = createServerSupabaseClient();
    const searchString = location ? `${searchTerm} in ${location}` : searchTerm;
    const countryCode = extractCountryCode(location);

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId).neq("status", "canceled");
    });

    try {
      const { runId, datasetId, apiKey } = await step.run("start-apify-run", () =>
        startGoogleMapsRun(searchString, maxResults || 30, countryCode)
      );

      let status: string = "RUNNING";
      for (let i = 0; i < MAX_POLLS; i++) {
        if (await step.run(`check-canceled-${i}`, () => isJobCanceled(supabase, jobId))) {
          await step.run("abort-apify-run", () => abortRun(runId, apiKey));
          return { jobId, status: "canceled" };
        }

        status = await step.run(`poll-${i}`, () => getRunStatus(runId, apiKey));
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

      // Apify's Google Maps actor treats maxCrawledPlaces as a soft target, not a hard cap — confirmed
      // live: requesting 30 for a broad city+category search ("hardware stores in Nairobi, Kenya")
      // still returned and billed for 500. Truncating here at least bounds what we store and pass to
      // downstream contact enrichment; it doesn't undo Apify's own overage billing for the run itself.
      const allPlaces = await step.run("fetch-dataset", () => getDatasetItems(datasetId, apiKey));
      const places = allPlaces.slice(0, maxResults || 30);

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
    } catch (err: any) {
      // Without this, an exception thrown before the polling loop even starts (e.g. Apify
      // rejecting the run's input, confirmed live with an invalid countryCode) leaves the job
      // permanently stuck at "running" — Inngest marks the function run itself as failed, but
      // nothing updates the scrape_jobs row unless it's caught here.
      await step.run("mark-error-exception", async () => {
        await supabase
          .from("scrape_jobs")
          .update({ status: "error", finished_at: new Date().toISOString(), result_summary: { error: err?.message ?? "Unknown error" } })
          .eq("id", jobId)
          .neq("status", "canceled");
      });
      throw err;
    }
  }
);
