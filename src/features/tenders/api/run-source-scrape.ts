import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders } from "./firecrawlExtract";
import { getSourceConfig } from "./sourceConfigs";

function computeStatus(closingDate: string | null): "open" | "closed" {
  if (!closingDate) return "open";
  const parsed = new Date(closingDate);
  if (isNaN(parsed.getTime())) return "open";
  return parsed.getTime() < Date.now() ? "closed" : "open";
}

export const runSourceScrapeJob = inngest.createFunction(
  { id: "run-source-scrape-job", retries: 1, triggers: { event: "tenders/source.queued" } },
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

    const extracted = await step.run("extract", () => extractTenders(config.url, config.prompt));

    const inserted = await step.run("save-tenders", async () => {
      if (extracted.length === 0) return 0;

      const { data: existing } = await supabase.from("tenders").select("source_url").not("source_url", "is", null);
      const existingUrls = new Set((existing || []).map((t) => t.source_url));

      const rows = extracted
        .filter((t) => t.source_url && !existingUrls.has(t.source_url))
        .map((t) => ({
          title: t.title,
          description: t.description || null,
          closing_date: t.closing_date && !isNaN(new Date(t.closing_date).getTime()) ? new Date(t.closing_date).toISOString().slice(0, 10) : null,
          source_url: t.source_url,
          status: computeStatus(t.closing_date ?? null),
          tender_type: tenderType,
          format: t.source_url?.toLowerCase().endsWith(".pdf") ? "PDF" : t.source_url?.toLowerCase().endsWith(".docx") ? "DOCX" : "HTML",
          scraped_at: new Date().toISOString(),
        }));

      if (rows.length === 0) return 0;
      const { error } = await supabase.from("tenders").insert(rows);
      if (error) throw error;
      return rows.length;
    });

    await step.run("mark-done", async () => {
      await supabase
        .from("scrape_jobs")
        .update({ status: "done", finished_at: new Date().toISOString(), result_summary: { tendersFound: inserted, totalExtracted: extracted.length } })
        .eq("id", jobId);
    });

    return { jobId, tendersFound: inserted };
  }
);
