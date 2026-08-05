import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders } from "./firecrawlExtract";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "./tenderRow";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";

const TENDER_TYPE = "Website Tenders";
// Scraping all ~1000 rows in `websites` in a single run isn't practical (Firecrawl cost/time);
// each scheduled run processes a bounded batch instead, ordered oldest-checked-first (nulls —
// never checked — sort first) so repeated runs rotate through the full list instead of always
// hitting the same head slice. A single `websiteId` (from the Upload Website page's "Scan Now"
// action) skips the batch and checks just that one site instead.
const BATCH_SIZE = 15;

export const runWebsiteScrapeJob = inngest.createFunction(
  { id: "run-website-scrape-job", retries: 0, triggers: { event: "tenders/website.queued" } },
  async ({ event, step }) => {
    const { jobId, websiteId } = event.data as { jobId: string; websiteId?: number };
    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId);
    });

    try {
      const [{ data: websites }, { data: searchTerms }] = await step.run("fetch-inputs", async () => {
        const websitesQuery = websiteId
          ? supabase.from("websites").select("id, name, url").eq("id", websiteId)
          : supabase
              .from("websites")
              .select("id, name, url")
              .order("last_scraped_at", { ascending: true, nullsFirst: true })
              .limit(BATCH_SIZE);
        return Promise.all([websitesQuery, supabase.from("search_terms").select("term").limit(20)]);
      });

      const terms = (searchTerms || []).map((t) => t.term).join(", ");
      const prompt = `This is a business/organization website. Look for any tenders, RFPs, RFQs, or procurement opportunities mentioned anywhere on the page (related to topics like: ${terms || "general procurement"}). Extract each one found, with its title, closing/deadline date if shown, the full URL to the tender/notice if available (otherwise use the page URL), the direct document/PDF link if different, the issuing organization (usually this website's own organization unless stated otherwise), a short category label, location, and budget/value if stated. If no tenders are found, return an empty list.`;

      if (await step.run("check-canceled-before-extract", () => isJobCanceled(supabase, jobId))) {
        return { jobId, tendersFound: 0, canceled: true };
      }

      let totalInserted = 0;
      let processed = 0;
      let openCount = 0;
      let closedCount = 0;

      // Extracted concurrently instead of one site at a time.
      await Promise.all(
        (websites || []).map(async (website) => {
          const { tenders: extracted, markdown } = await step.run(`extract-${website.id}`, async () => {
            try {
              return await extractTenders(website.url, prompt);
            } catch {
              return { tenders: [], markdown: null };
            }
          });

          const { inserted, open, closed } = await step.run(`save-${website.id}`, async () => {
            const rows = extracted
              .filter((t) => t.source_url || website.url)
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
                ...resolveOptionalFields(t),
              }));

            return insertTenderRows(supabase, rows);
          });

          processed += 1;
          totalInserted += inserted;
          openCount += open;
          closedCount += closed;

          await step.run(`progress-${website.id}`, async () => {
            await Promise.all([
              supabase.from("scrape_jobs").update({ progress: { stage: "running", processed, total: (websites || []).length } }).eq("id", jobId),
              supabase.from("websites").update({ last_scraped_at: new Date().toISOString() }).eq("id", website.id),
            ]);
          });
        })
      );

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

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, totalInserted));
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
