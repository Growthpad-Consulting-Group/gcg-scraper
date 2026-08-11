import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders } from "./firecrawlExtract";
import { fetchPpipTenders } from "./ppipApi";
import { getSourceConfig, buildRelevanceClause, matchesKeywords, matchesCountries, matchesSourceContent } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "./tenderRow";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";

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

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "extracting" } }).eq("id", jobId);
    });

    try {
      // PPIP's listing page has no real per-tender links for the LLM to extract (confirmed
      // live: a fabricated source_url made it into the DB) — its own JSON API gives real
      // numeric ids and structured fields instead, so it skips the scrape+extract path entirely.
      const { tenders: extracted, markdown } = await step.run("extract", () => {
        if (tenderType === "PPIP") return fetchPpipTenders();
        const relevanceClause = buildRelevanceClause(keywords, countries);
        const prompt = relevanceClause ? `${config.prompt} ${relevanceClause}` : config.prompt;
        return extractTenders(config.url, prompt, { waitFor: config.waitFor, timeout: config.timeout, proxy: config.proxy });
      });

      const { inserted, open: openCount, closed: closedCount, rows: insertedTenders } = await step.run("save-tenders", async () => {
        const rows = extracted
          .filter((t) => t.source_url && matchesKeywords(t, keywords) && matchesCountries(t, countries) && matchesSourceContent(t, markdown))
          .map((t) => ({
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
          }));

        return insertTenderRows(supabase, rows);
      });

      await step.run("mark-done", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: { tendersFound: inserted, totalTenders: inserted, totalExtracted: extracted.length, openTenders: openCount, closedTenders: closedCount },
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
