import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { parseDocument } from "./firecrawlParse";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields, type InsertedTenderSummary } from "./tenderRow";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";

const TENDER_TYPE = "Document Tenders";

export const runDocumentParseJob = inngest.createFunction(
  { id: "run-document-parse-job", retries: 0, triggers: { event: "tenders/document.queued" } },
  async ({ event, step }) => {
    const { jobId, fileName, mimeType, fileBase64 } = event.data as {
      jobId: string;
      fileName: string;
      mimeType: string;
      fileBase64: string;
    };

    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase
        .from("scrape_jobs")
        .update({ status: "running", progress: { stage: "starting" } })
        .eq("id", jobId);
    });

    try {
      if (await step.run("check-canceled", () => isJobCanceled(supabase, jobId))) {
        return { jobId, tendersFound: 0, canceled: true };
      }

      const { tenders: extracted, markdown } = await step.run("parse-document", async () => {
        // Reconstruct the File from the base64 payload so parseDocument can send it
        // to Firecrawl as multipart/form-data.
        const buffer = Buffer.from(fileBase64, "base64");
        const blob = new Blob([buffer], { type: mimeType });
        return parseDocument(blob, fileName);
      });

      await step.run("update-progress", async () => {
        await supabase
          .from("scrape_jobs")
          .update({ progress: { stage: "saving", processed: extracted.length } })
          .eq("id", jobId);
      });

      const insertedTenders: InsertedTenderSummary[] = [];
      let totalInserted = 0;
      let openCount = 0;
      let closedCount = 0;

      const { inserted, open, closed, rows: insertedRows } = await step.run("save-tenders", async () => {
        const rows = extracted.map((t) => ({
          title: t.title,
          description: t.description || null,
          closing_date: resolveClosingDate(t.closing_date),
          source_url: t.source_url || `document:${jobId}:${t.title.slice(0, 80)}`,
          status: computeStatus(t.closing_date ?? null),
          tender_type: TENDER_TYPE,
          format: "Document",
          scraped_at: new Date().toISOString(),
          raw_content: markdown,
          job_id: jobId,
          ...resolveOptionalFields(t),
        }));
        return insertTenderRows(supabase, rows);
      });

      totalInserted = inserted;
      openCount = open;
      closedCount = closed;
      insertedTenders.push(...insertedRows);

      await step.run("mark-done", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: {
              tendersFound: totalInserted,
              totalTenders: totalInserted,
              openTenders: openCount,
              closedTenders: closedCount,
              fileName,
            },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, totalInserted, insertedTenders));
      await step.run("log-done", () =>
        logJobOutcome(supabase, jobId, `Document "${fileName}" parsed: ${totalInserted} tender(s) found.`)
      );

      return { jobId, tendersFound: totalInserted };
    } catch (err: any) {
      await step.run("mark-error", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            result_summary: { error: err?.message ?? "Unknown error" },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });
      await step.run("log-error", () =>
        logJobOutcome(supabase, jobId, `Document parse failed: ${err?.message ?? "Unknown error"}`)
      );
      throw err;
    }
  }
);
