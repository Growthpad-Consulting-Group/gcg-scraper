import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders } from "./firecrawlExtract";

const TENDER_TYPE = "Website Tenders";
// Scraping all ~1000 rows in `websites` in a single run isn't practical (Firecrawl cost/time);
// each scheduled run processes a bounded batch instead. Runs it repeatedly over time to cover
// the full list — a known limitation, not full coverage per run.
const BATCH_SIZE = 15;

function computeStatus(closingDate: string | null): "open" | "closed" {
  if (!closingDate) return "open";
  const parsed = new Date(closingDate);
  if (isNaN(parsed.getTime())) return "open";
  return parsed.getTime() < Date.now() ? "closed" : "open";
}

export const runWebsiteScrapeJob = inngest.createFunction(
  { id: "run-website-scrape-job", retries: 1, triggers: { event: "tenders/website.queued" } },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string };
    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId);
    });

    const [{ data: websites }, { data: searchTerms }] = await step.run("fetch-inputs", async () => {
      return Promise.all([
        supabase.from("websites").select("id, name, url").order("id").limit(BATCH_SIZE),
        supabase.from("search_terms").select("term").limit(20),
      ]);
    });

    const terms = (searchTerms || []).map((t) => t.term).join(", ");
    const prompt = `This is a business/organization website. Look for any tenders, RFPs, RFQs, or procurement opportunities mentioned anywhere on the page (related to topics like: ${terms || "general procurement"}). Extract each one found, with its title, closing/deadline date if shown, and the full URL to the tender/notice if available (otherwise use the page URL). If no tenders are found, return an empty list.`;

    let totalInserted = 0;
    let processed = 0;

    for (const website of websites || []) {
      const extracted = await step.run(`extract-${website.id}`, async () => {
        try {
          return await extractTenders(website.url, prompt);
        } catch {
          return [];
        }
      });

      processed += 1;

      const insertedForSite = await step.run(`save-${website.id}`, async () => {
        if (extracted.length === 0) return 0;
        const { data: existing } = await supabase.from("tenders").select("source_url").not("source_url", "is", null);
        const existingUrls = new Set((existing || []).map((t) => t.source_url));

        const rows = extracted
          .filter((t) => (t.source_url || website.url) && !existingUrls.has(t.source_url || website.url))
          .map((t) => ({
            title: t.title,
            description: t.description || null,
            closing_date: t.closing_date && !isNaN(new Date(t.closing_date).getTime()) ? new Date(t.closing_date).toISOString().slice(0, 10) : null,
            source_url: t.source_url || website.url,
            status: computeStatus(t.closing_date ?? null),
            tender_type: TENDER_TYPE,
            format: "HTML",
            scraped_at: new Date().toISOString(),
          }));

        if (rows.length === 0) return 0;
        const { error } = await supabase.from("tenders").insert(rows);
        if (error) throw error;
        return rows.length;
      });

      totalInserted += insertedForSite;

      await step.run(`progress-${website.id}`, async () => {
        await supabase.from("scrape_jobs").update({ progress: { stage: "running", processed, total: (websites || []).length } }).eq("id", jobId);
      });
    }

    await step.run("mark-done", async () => {
      await supabase
        .from("scrape_jobs")
        .update({ status: "done", finished_at: new Date().toISOString(), result_summary: { tendersFound: totalInserted, websitesProcessed: processed } })
        .eq("id", jobId);
    });

    return { jobId, tendersFound: totalInserted };
  }
);
