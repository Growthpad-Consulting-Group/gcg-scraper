import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders } from "./firecrawlExtract";
import { getSourceConfig } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "./tenderRow";
import { notifyTaskOwner } from "@/features/scraping/api/notify";

export const runSourceScrapeJob = inngest.createFunction(
  { id: "run-source-scrape-job", retries: 0, triggers: { event: "tenders/source.queued" } },
  async ({ event, step }) => {
    const { jobId, tenderType } = event.data as { jobId: string; tenderType: string };
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
      const extracted = await step.run("extract", () => extractTenders(config.url, config.prompt));

      const { inserted, openCount, closedCount } = await step.run("save-tenders", async () => {
        const rows = extracted
          .filter((t) => t.source_url)
          .map((t) => ({
            title: t.title,
            description: t.description || null,
            closing_date: resolveClosingDate(t.closing_date),
            source_url: t.source_url as string,
            status: computeStatus(t.closing_date ?? null),
            tender_type: tenderType,
            format: t.source_url?.toLowerCase().endsWith(".pdf") ? "PDF" : t.source_url?.toLowerCase().endsWith(".docx") ? "DOCX" : "HTML",
            scraped_at: new Date().toISOString(),
            ...resolveOptionalFields(t),
          }));

        const inserted = await insertTenderRows(supabase, rows);
        return {
          inserted,
          openCount: rows.filter((r) => r.status === "open").length,
          closedCount: rows.filter((r) => r.status === "closed").length,
        };
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

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, inserted));

      return { jobId, tendersFound: inserted };
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
