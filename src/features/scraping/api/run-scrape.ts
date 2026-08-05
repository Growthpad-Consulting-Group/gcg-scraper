import { inngest } from "./inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { searchWeb } from "./firecrawlSearch";
import { extractTenders } from "@/features/tenders/api/firecrawlExtract";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields, type InsertedTenderSummary } from "@/features/tenders/api/tenderRow";
import { isJobCanceled } from "./jobStatus";
import { notifyTaskOwner } from "./notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";

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

      if (await step.run("check-canceled-before-extract", () => isJobCanceled(supabase, jobId))) {
        return { jobId, visited: 0, tendersFound: 0, canceled: true };
      }

      const prompt = `Extract any tender, RFP, RFQ, or procurement opportunity details from this page relevant to: "${query}". Include title, closing/deadline date if shown, the full URL linking to the specific tender/notice, the direct document/PDF link if different, the issuing organization, a short category label, location, and budget/value if stated.`;

      let visited = 0;
      let totalInserted = 0;
      let openCount = 0;
      let closedCount = 0;
      const insertedTenders: InsertedTenderSummary[] = [];

      // Extracted concurrently instead of one-at-a-time — this was the single biggest latency
      // cost in the whole pipeline (up to ~60s × 10 results run sequentially before).
      await Promise.all(
        results.map(async (result) => {
          const { tenders: extracted, markdown } = await step.run(`extract-${result.url}`, async () => {
            try {
              return await extractTenders(result.url, prompt);
            } catch {
              return { tenders: [], markdown: null };
            }
          });

          const { inserted, open, closed, rows: insertedRows } = await step.run(`save-${result.url}`, async () => {
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
                raw_content: markdown,
                job_id: jobId,
                ...resolveOptionalFields(t),
              }));

            return insertTenderRows(supabase, rows);
          });

          visited += 1;
          totalInserted += inserted;
          openCount += open;
          closedCount += closed;
          insertedTenders.push(...insertedRows);

          await step.run(`progress-${result.url}`, async () => {
            await supabase
              .from("scrape_jobs")
              .update({ progress: { visited, total: results.length, current_url: result.url, stage: "extracting" } })
              .eq("id", jobId);
          });
        })
      );

      await step.run("mark-done", async () => {
        // Skip if a cancel landed mid-batch.
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

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, totalInserted, insertedTenders));
      await step.run("log-done", () => logJobOutcome(supabase, jobId, `Run finished: ${totalInserted} tender(s) found.`));

      return { jobId, visited, tendersFound: totalInserted };
    } catch (err: any) {
      await step.run("mark-error", async () => {
        await supabase
          .from("scrape_jobs")
          .update({ status: "error", finished_at: new Date().toISOString(), result_summary: { error: err?.message ?? "Unknown error" } })
          .eq("id", jobId)
          .neq("status", "canceled");
      });
      await step.run("log-error", () => logJobOutcome(supabase, jobId, `Run failed: ${err?.message ?? "Unknown error"}`));
      throw err;
    }
  }
);
