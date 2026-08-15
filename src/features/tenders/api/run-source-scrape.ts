import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders } from "./firecrawlExtract";
import { fetchPpipTenders } from "./ppipApi";
import { fetchReliefwebTenders } from "./reliefwebApi";
import { getSourceConfig, buildRelevanceClause, classifyRejection, rejectionSummary, type RejectionReason } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "./tenderRow";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";

export const runSourceScrapeJob = inngest.createFunction(
  {
    id: "run-source-scrape-job",
    retries: 0,
    triggers: { event: "tenders/source.queued" },
    // Scheduled sources all fire within the same cron tick, which was bursting past Firecrawl's
    // per-minute rate limit (429s on PPIP/Treasury/UNDP). Throttle to spread calls out instead.
    throttle: { limit: 3, period: "1m" },
  },
  async ({ event, step }) => {
    const { jobId, tenderType, keywords, countries } = event.data as {
      jobId: string;
      tenderType: string;
      keywords?: string[];
      countries?: string[];
    };
    const supabase = createServerSupabaseClient();
    const config = getSourceConfig(tenderType);

    if (!config) {
      await step.run("mark-error-unknown-source", async () => {
        await supabase.from("scrape_jobs").update({ status: "error", finished_at: new Date().toISOString(), result_summary: { error: `Unknown tender source: ${tenderType}` } }).eq("id", jobId);
      });
      return { jobId, error: "unknown_source" };
    }

    // `.neq` guard: without it, a cancel landing while the job is still queued/starting gets
    // silently overwritten back to "running" by this very step (confirmed live elsewhere).
    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "extracting" } }).eq("id", jobId).neq("status", "canceled");
    });

    if (await step.run("check-canceled-before-extract", () => isJobCanceled(supabase, jobId))) {
      return { jobId, tendersFound: 0, canceled: true };
    }

    try {
      // PPIP's listing page has no real per-tender links for the LLM to extract (confirmed
      // live: a fabricated source_url made it into the DB) — its own JSON API gives real
      // numeric ids and structured fields instead, so it skips the scrape+extract path entirely.
      // ReliefWeb Jobs similarly moved off the scraped+LLM-extracted page to ReliefWeb's own API
      // (real closing dates/org names/URLs, no risk of the model inventing a listing from a
      // sidebar link — see #446's post-mortem in sourceConfigs.ts's matchesSourceContent).
      const { tenders: extracted, markdown } = await step.run("extract", () => {
        if (tenderType === "PPIP") return fetchPpipTenders();
        if (tenderType === "ReliefWeb Jobs") return fetchReliefwebTenders();
        const relevanceClause = buildRelevanceClause(keywords, countries);
        const prompt = relevanceClause ? `${config.prompt} ${relevanceClause}` : config.prompt;
        return extractTenders(config.url, prompt, { waitFor: config.waitFor, timeout: config.timeout, proxy: config.proxy });
      });

      const { inserted, open: openCount, closed: closedCount, rows: insertedTenders, rejectionCounts } = await step.run("save-tenders", async () => {
        const rejectionCounts: Record<RejectionReason, number> = { no_url: 0, country: 0, keywords: 0, source_content: 0 };
        const rows = extracted.flatMap((t) => {
          const reason = classifyRejection(t, { keywords, countries, markdown });
          if (reason) {
            rejectionCounts[reason] += 1;
            return [];
          }
          return [
            {
              title: t.title,
              description: t.description || null,
              closing_date: resolveClosingDate(t.closing_date, config.dateFormat),
              source_url: t.source_url as string,
              status: computeStatus(t.closing_date ?? null, config.dateFormat),
              tender_type: tenderType,
              format: t.source_url?.toLowerCase().endsWith(".pdf") ? "PDF" : t.source_url?.toLowerCase().endsWith(".docx") ? "DOCX" : "HTML",
              scraped_at: new Date().toISOString(),
              raw_content: markdown,
              job_id: jobId,
              ...resolveOptionalFields(t),
              ...(config.skipBudget ? { budget: null } : {}),
            },
          ];
        });

        const result = await insertTenderRows(supabase, rows);
        return { ...result, rejectionCounts };
      });

      const passedFilters = extracted.length - Object.values(rejectionCounts).reduce((a, b) => a + b, 0);

      await step.run("mark-done", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: {
              tendersFound: inserted,
              totalTenders: inserted,
              totalExtracted: extracted.length,
              openTenders: openCount,
              closedTenders: closedCount,
              passedFilters,
              droppedAsDuplicate: passedFilters - inserted,
              ...(rejectionSummary(rejectionCounts) ? { rejectedBy: rejectionSummary(rejectionCounts) } : {}),
            },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, inserted, insertedTenders));
      await step.run("log-done", () => logJobOutcome(supabase, jobId, `Run finished: ${inserted} tender(s) found.`));

      return { jobId, tendersFound: inserted };
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
