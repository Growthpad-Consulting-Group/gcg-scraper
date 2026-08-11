import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { findLinkedInTenderCandidates, extractLinkedInTender } from "./linkedinTendersApi";
import type { ExtractedTender } from "./firecrawlExtract";
import { matchesKeywords, matchesCountries, matchesSourceContent } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "./tenderRow";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";

const TENDER_TYPE = "LinkedIn Tenders";
// Bounds Firecrawl cost per run — LinkedIn post search itself is cheap ($0.002/post), but each
// candidate then costs a full extraction call against its resolved destination page.
const MAX_CANDIDATES_PER_RUN = 12;

export const runLinkedInTendersScrapeJob = inngest.createFunction(
  {
    id: "run-linkedin-tenders-scrape-job",
    retries: 0,
    triggers: { event: "tenders/linkedin-tenders.queued" },
    throttle: { limit: 3, period: "1m" },
  },
  async ({ event, step }) => {
    const { jobId, keywords, countries, searchPhrases } = event.data as {
      jobId: string;
      keywords?: string[];
      countries?: string[];
      searchPhrases?: string[];
    };
    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "searching" } }).eq("id", jobId);
    });

    try {
      const phrases = await step.run("resolve-phrases", async () => {
        if (searchPhrases?.length) return searchPhrases;
        // Task hasn't customized its own list — fall back to the shared default list (same
        // DB-managed pattern as search_terms), not a value baked into app code.
        const { data, error } = await supabase.from("linkedin_search_phrases").select("phrase").order("phrase");
        if (error) throw error;
        return (data || []).map((row) => row.phrase as string);
      });

      const candidates = await step.run("search-posts", () => findLinkedInTenderCandidates(keywords, phrases));
      const bounded = candidates.slice(0, MAX_CANDIDATES_PER_RUN);

      await step.run("update-progress", async () => {
        await supabase.from("scrape_jobs").update({ progress: { stage: "extracting", candidates: bounded.length } }).eq("id", jobId);
      });

      const extracted: { tender: ExtractedTender; markdown: string | null; postUrl: string }[] = [];
      for (const candidate of bounded) {
        const result = await step.run(`extract-${candidate.resolvedUrl}`, () => extractLinkedInTender(candidate));
        if (result) extracted.push({ ...result, postUrl: candidate.postUrl });
      }

      const { inserted, open: openCount, closed: closedCount, rows: insertedTenders } = await step.run("save-tenders", async () => {
        const rows = extracted
          .filter(
            (e) =>
              e.tender.source_url &&
              matchesKeywords(e.tender, keywords) &&
              matchesCountries(e.tender, countries) &&
              matchesSourceContent(e.tender, e.markdown)
          )
          .map((e) => ({
            title: e.tender.title,
            description: e.tender.description || null,
            closing_date: resolveClosingDate(e.tender.closing_date),
            source_url: e.tender.source_url as string,
            status: computeStatus(e.tender.closing_date ?? null),
            tender_type: TENDER_TYPE,
            format: e.tender.source_url?.toLowerCase().endsWith(".pdf") ? "PDF" : "HTML",
            scraped_at: new Date().toISOString(),
            raw_content: e.markdown,
            job_id: jobId,
            ...resolveOptionalFields(e.tender),
          }));

        return insertTenderRows(supabase, rows);
      });

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
              candidatesChecked: bounded.length,
              openTenders: openCount,
              closedTenders: closedCount,
            },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, inserted, insertedTenders));
      await step.run("log-done", () => logJobOutcome(supabase, jobId, `Run finished: ${inserted} tender(s) found from ${bounded.length} LinkedIn post(s) checked.`));

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
