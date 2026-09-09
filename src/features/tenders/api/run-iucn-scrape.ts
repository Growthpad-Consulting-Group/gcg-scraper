import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders } from "./firecrawlExtract";
import { buildRelevanceClause, classifyRejection, rejectionSummary, type RejectionReason } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields, type InsertedTenderSummary } from "./tenderRow";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";

const TENDER_TYPE = "IUCN Procurement";
const SITE_URL = "https://procurement.iucn.org/";

export const runIucnScrapJob = inngest.createFunction(
  { id: "run-iucn-scrape-job", retries: 0, triggers: { event: "tenders/iucn.queued" }, throttle: { limit: 3, period: "1m" } },
  async ({ event, step }) => {
    const { jobId, keywords, countries } = event.data as {
      jobId: string;
      keywords?: string[];
      countries?: string[];
    };
    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId).neq("status", "canceled");
    });

    try {
      const { data: searchTerms } = await step.run("fetch-keywords", async () => {
        return supabase.from("search_terms").select("term");
      });

      const globalTerms = (searchTerms || []).map((t) => t.term);
      const effectiveKeywords = keywords && keywords.length ? keywords : globalTerms;
      const terms = effectiveKeywords.join(", ");
      const countryClause = buildRelevanceClause(undefined, countries);

      const prompt = `This is IUCN's procurement portal listing open tenders, RFQs, and consulting opportunities globally. Extract all tenders/opportunities found, with title, submission deadline, IUCN office leading, country of performance, expected contract duration, category, and estimated contract value if stated. Look for opportunities related to: ${terms || "general procurement"}. ${countryClause ? countryClause : ""} If no tenders match your search, return an empty list.`;

      if (await step.run("check-canceled", () => isJobCanceled(supabase, jobId))) {
        return { jobId, tendersFound: 0, canceled: true };
      }

      // IUCN's portal is client-rendered; needs a longer wait than typical static sites
      const { tenders: extracted, markdown } = await step.run("extract", async () => {
        try {
          return await extractTenders(SITE_URL, prompt, { waitFor: 4000 });
        } catch {
          return { tenders: [], markdown: null };
        }
      });

      const rejectionCounts: Record<RejectionReason, number> = { no_url: 0, country: 0, keywords: 0, source_content: 0 };
      const insertedTenders: InsertedTenderSummary[] = [];

      const { inserted, open, closed, rows: insertedRows, siteRejections } = await step.run("save", async () => {
        const siteRejections: Record<RejectionReason, number> = { no_url: 0, country: 0, keywords: 0, source_content: 0 };
        const rows = extracted.flatMap((t) => {
          const reason = classifyRejection(t, { keywords: effectiveKeywords, countries, markdown, fallbackUrl: SITE_URL });
          if (reason) {
            siteRejections[reason] += 1;
            return [];
          }
          return [
            {
              title: t.title,
              description: t.description || null,
              closing_date: resolveClosingDate(t.closing_date),
              source_url: t.source_url || SITE_URL,
              status: computeStatus(t.closing_date ?? null),
              tender_type: TENDER_TYPE,
              format: "HTML",
              scraped_at: new Date().toISOString(),
              raw_content: markdown,
              job_id: jobId,
              ...resolveOptionalFields(t),
            },
          ];
        });

        const result = await insertTenderRows(supabase, rows);
        return { ...result, siteRejections };
      });

      (Object.keys(siteRejections) as RejectionReason[]).forEach((r) => (rejectionCounts[r] += siteRejections[r]));
      insertedTenders.push(...insertedRows);

      await step.run("mark-done", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: {
              tendersFound: inserted,
              totalExtracted: extracted.length,
              openTenders: open,
              closedTenders: closed,
              passedFilters: extracted.length - Object.values(rejectionCounts).reduce((a, b) => a + b, 0),
              droppedAsDuplicate: extracted.length - Object.values(rejectionCounts).reduce((a, b) => a + b, 0) - inserted,
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
