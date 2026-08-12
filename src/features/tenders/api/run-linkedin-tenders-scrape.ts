import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { findLinkedInTenderCandidates, extractLinkedInTender, MAX_LINKEDIN_CANDIDATES } from "./linkedinTendersApi";
import type { ExtractedTender } from "./firecrawlExtract";
import { matchesKeywords, matchesCountries, matchesSourceContent } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "./tenderRow";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";

const TENDER_TYPE = "LinkedIn Tenders";
// Confirmed live: back-to-back Firecrawl extraction calls (one per candidate, right after the
// search phase's own resolve calls) hit a 429 on an account with an 18 req/min ceiling — spacing
// these out keeps the whole run's Firecrawl call volume under that limit.
const FIRECRAWL_CALL_SPACING_MS = 3500;

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

    // `.neq` guard: without it, a cancel landing while the job is still queued/starting gets
    // silently overwritten back to "running" by this very step (confirmed live elsewhere).
    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "searching" } }).eq("id", jobId).neq("status", "canceled");
    });

    if (await step.run("check-canceled-before-search", () => isJobCanceled(supabase, jobId))) {
      return { jobId, tendersFound: 0, canceled: true };
    }

    try {
      const phrases = await step.run("resolve-phrases", async () => {
        if (searchPhrases?.length) return searchPhrases;
        // Task hasn't customized its own list — fall back to the shared default list (same
        // DB-managed pattern as search_terms), not a value baked into app code.
        const { data, error } = await supabase.from("linkedin_search_phrases").select("phrase").order("phrase");
        if (error) throw error;
        return (data || []).map((row) => row.phrase as string);
      });

      // findLinkedInTenderCandidates already caps collection at MAX_LINKEDIN_CANDIDATES itself
      // (paced internally) — this slice is just a defensive backstop, not the real limit.
      const candidates = await step.run("search-posts", () => findLinkedInTenderCandidates(keywords, phrases));
      const bounded = candidates.slice(0, MAX_LINKEDIN_CANDIDATES);

      await step.run("update-progress", async () => {
        await supabase.from("scrape_jobs").update({ progress: { stage: "extracting", candidates: bounded.length } }).eq("id", jobId);
      });

      // Extraction paces one call every 3.5s across up to MAX_LINKEDIN_CANDIDATES — the longest
      // phase of this job by far, so a cancel mid-run needs to actually stop it here rather than
      // only being checked before it starts.
      const extracted: { tender: ExtractedTender; markdown: string | null; postUrl: string }[] = [];
      for (let i = 0; i < bounded.length; i++) {
        if (await step.run(`check-canceled-${i}`, () => isJobCanceled(supabase, jobId))) {
          return { jobId, tendersFound: 0, canceled: true };
        }
        const candidate = bounded[i];
        if (i > 0) await step.sleep(`space-extract-${i}`, `${FIRECRAWL_CALL_SPACING_MS}ms`);
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
