import { inngest } from "./inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { searchWeb } from "./firecrawlSearch";
import { extractTenders } from "@/features/tenders/api/firecrawlExtract";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "@/features/tenders/api/tenderRow";
import { isJobCanceled } from "./jobStatus";
import { notifyTaskOwner } from "./notify";

const TENDER_TYPE = "Search Query Tenders";
const RESULTS_LIMIT = 10;

export const runScrapeJob = inngest.createFunction(
  // Single attempt: a retry would just re-run the same slow multi-URL extraction from scratch.
  // The catch-all below guarantees the job always lands in a terminal status either way, instead
  // of getting stuck at "running" forever if something throws past the per-URL try/catch.
  { id: "run-scrape-job", retries: 0, triggers: { event: "scrape/job.queued" } },
  async ({ event, step }) => {
    // `engines` is accepted for backward compatibility with older callers but no longer drives
    // behavior — Firecrawl's /search endpoint replaces per-engine SERP scraping entirely.
    const { jobId, query } = event.data as { jobId: string; query: string; engines?: string[] };

    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "searching" } }).eq("id", jobId);
    });

    try {
      const results = await step.run("search", () => searchWeb(query, RESULTS_LIMIT));

      await step.run("progress-searched", async () => {
        await supabase.from("scrape_jobs").update({ progress: { visited: 0, total: results.length, stage: "extracting" } }).eq("id", jobId);
      });

      const prompt = `Extract any tender, RFP, RFQ, or procurement opportunity details from this page relevant to: "${query}". Include title, closing/deadline date if shown, the full URL linking to the specific tender/notice, the issuing organization, a short category label, location, and budget/value if stated.`;

      let visited = 0;
      let totalInserted = 0;
      let openCount = 0;
      let closedCount = 0;

      for (const result of results) {
        if (await step.run(`check-canceled-${visited}`, () => isJobCanceled(supabase, jobId))) {
          return { jobId, visited, tendersFound: totalInserted, canceled: true };
        }

        const extracted = await step.run(`extract-${result.url}`, async () => {
          try {
            return await extractTenders(result.url, prompt);
          } catch {
            return [];
          }
        });

        visited += 1;

        const { inserted: insertedForUrl, open, closed } = await step.run(`save-${result.url}`, async () => {
          const rows = extracted
            .filter((t) => t.source_url || result.url)
            .map((t) => ({
              title: t.title,
              description: t.description || null,
              closing_date: resolveClosingDate(t.closing_date),
              source_url: t.source_url || result.url,
              status: computeStatus(t.closing_date ?? null),
              tender_type: TENDER_TYPE,
              format: (t.source_url || result.url).toLowerCase().endsWith(".pdf") ? "PDF" : "HTML",
              scraped_at: new Date().toISOString(),
              ...resolveOptionalFields(t),
            }));

          const inserted = await insertTenderRows(supabase, rows);
          return { inserted, open: rows.filter((r) => r.status === "open").length, closed: rows.filter((r) => r.status === "closed").length };
        });

        totalInserted += insertedForUrl;
        openCount += open;
        closedCount += closed;

        await step.run(`progress-${visited}`, async () => {
          await supabase
            .from("scrape_jobs")
            .update({ progress: { visited, total: results.length, current_url: result.url, stage: "extracting" } })
            .eq("id", jobId);
        });
      }

      await step.run("mark-done", async () => {
        // Skip if a cancel landed in the tiny window after the last per-URL check.
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: { urls_visited: visited, tendersFound: totalInserted, totalTenders: totalInserted, openTenders: openCount, closedTenders: closedCount },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, totalInserted));

      return { jobId, visited, tendersFound: totalInserted };
    } catch (err: any) {
      await step.run("mark-error", async () => {
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
