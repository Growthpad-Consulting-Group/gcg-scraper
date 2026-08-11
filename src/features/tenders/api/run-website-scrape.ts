import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders, type ExtractOptions } from "./firecrawlExtract";
import { buildRelevanceClause, matchesKeywords, matchesCountries, matchesSourceContent } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields, type InsertedTenderSummary } from "./tenderRow";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";
import { mapWithConcurrency } from "@/shared/lib/concurrency";

const TENDER_TYPE = "Website Tenders";
// Firecrawl's account limit is 18 req/min — confirmed live elsewhere (LinkedIn Tenders) that a
// wider burst than that reliably 429s. 8 in flight leaves headroom under that ceiling given each
// extract call takes a few seconds anyway (rarely all 8 land in the same one-second window).
const MAX_CONCURRENT_EXTRACTS = 8;
// Scraping all rows in `websites` in a single run isn't practical (Firecrawl cost/time); each
// scheduled run processes a bounded batch instead, ordered oldest-checked-first (nulls — never
// checked — sort first) so repeated runs rotate through the full list instead of always hitting
// the same head slice. A single `websiteId` (from the Upload Website page's "Scan Now" action)
// skips the batch and checks just that one site instead.
// Raised from 15 after curating the list down to ~218 orgs plausibly likely to run their own
// tenders page (government bodies, NGOs, universities) — 30/week cycles the full list in ~7
// weeks instead of ~15 weeks, for a small, bounded increase in per-run Firecrawl usage.
const BATCH_SIZE = 30;

export const runWebsiteScrapeJob = inngest.createFunction(
  // Shares the same Firecrawl account/quota as the other scrape jobs, so it's throttled the
  // same way to avoid contributing to 429 bursts (see run-source-scrape-job).
  { id: "run-website-scrape-job", retries: 0, triggers: { event: "tenders/website.queued" }, throttle: { limit: 3, period: "1m" } },
  async ({ event, step }) => {
    const { jobId, websiteId, websiteIds, extractOptions, keywords, countries } = event.data as {
      jobId: string;
      websiteId?: number;
      /** Targets a specific set of sites regardless of scrape-rotation order — e.g. covering a
       * batch of newly-added sources without waiting for the normal `last_scraped_at` rotation
       * to reach them. Takes priority over both `websiteId` and the default batch query. */
      websiteIds?: number[];
      extractOptions?: ExtractOptions;
      keywords?: string[];
      countries?: string[];
    };
    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId);
    });

    try {
      const [{ data: websites }, { data: searchTerms }] = await step.run("fetch-inputs", async () => {
        const websitesQuery = websiteIds?.length
          ? supabase.from("websites").select("id, name, url, location").in("id", websiteIds)
          : websiteId
            ? supabase.from("websites").select("id, name, url, location").eq("id", websiteId)
            : supabase
                .from("websites")
                .select("id, name, url, location")
                .order("last_scraped_at", { ascending: true, nullsFirst: true })
                .limit(BATCH_SIZE);
        return Promise.all([websitesQuery, supabase.from("search_terms").select("term").limit(20)]);
      });

      // Task-level keywords (from the scheduled task's search terms) take priority over the
      // global search_terms table when the task owner has specified their own.
      const globalTerms = (searchTerms || []).map((t) => t.term).join(", ");
      const terms = keywords && keywords.length ? keywords.join(", ") : globalTerms;
      const countryClause = buildRelevanceClause(undefined, countries);
      const buildPrompt = (location?: string | null) =>
        `This is a business/organization website. Look for any tenders, RFPs, RFQs, or procurement opportunities mentioned anywhere on the page (related to topics like: ${terms || "general procurement"}). Extract each one found, with its title, closing/deadline date if shown, the full URL to the tender/notice if available (otherwise use the page URL), the direct document/PDF link if different, the issuing organization (usually this website's own organization unless stated otherwise), a short category label, location, and budget/value if stated.${
          location ? ` If a tender's location isn't stated on the page, use "${location}" as a fallback.` : ""
        }${countryClause ? ` ${countryClause}` : ""} If no tenders are found, return an empty list.`;

      if (await step.run("check-canceled-before-extract", () => isJobCanceled(supabase, jobId))) {
        return { jobId, tendersFound: 0, canceled: true };
      }

      let totalInserted = 0;
      let processed = 0;
      let openCount = 0;
      let closedCount = 0;
      const insertedTenders: InsertedTenderSummary[] = [];

      // Bounded concurrency, not one-shot Promise.all across the whole batch — confirmed live
      // that a full-width burst (up to BATCH_SIZE=30 at once) reliably exceeds Firecrawl's
      // 18 req/min account limit; this account has a 429 fallback via extractTenders' own retry,
      // but that shouldn't be relied on to paper over a burst this app controls the size of.
      await mapWithConcurrency(websites || [], MAX_CONCURRENT_EXTRACTS, async (website) => {
          const { tenders: extracted, markdown } = await step.run(`extract-${website.id}`, async () => {
            try {
              return await extractTenders(website.url, buildPrompt(website.location), extractOptions);
            } catch {
              return { tenders: [], markdown: null };
            }
          });

          const { inserted, open, closed, rows: insertedRows } = await step.run(`save-${website.id}`, async () => {
            const rows = extracted
              .filter((t) => (t.source_url || website.url) && matchesKeywords(t, keywords) && matchesCountries(t, countries) && matchesSourceContent(t, markdown))
              .map((t) => ({
                title: t.title,
                description: t.description || null,
                closing_date: resolveClosingDate(t.closing_date),
                source_url: t.source_url || website.url,
                status: computeStatus(t.closing_date ?? null),
                tender_type: TENDER_TYPE,
                format: "HTML",
                scraped_at: new Date().toISOString(),
                raw_content: markdown,
                job_id: jobId,
                ...resolveOptionalFields(t),
              }));

            return insertTenderRows(supabase, rows);
          });

          processed += 1;
          totalInserted += inserted;
          openCount += open;
          closedCount += closed;
          insertedTenders.push(...insertedRows);

          await step.run(`progress-${website.id}`, async () => {
            await Promise.all([
              supabase.from("scrape_jobs").update({ progress: { stage: "running", processed, total: (websites || []).length } }).eq("id", jobId),
              supabase.from("websites").update({ last_scraped_at: new Date().toISOString() }).eq("id", website.id),
            ]);
          });
      });

      await step.run("mark-done", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: { tendersFound: totalInserted, totalTenders: totalInserted, websitesProcessed: processed, openTenders: openCount, closedTenders: closedCount },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, totalInserted, insertedTenders));
      await step.run("log-done", () => logJobOutcome(supabase, jobId, `Run finished: ${totalInserted} tender(s) found across ${processed} site(s).`));

      return { jobId, tendersFound: totalInserted };
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
