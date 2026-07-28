import { inngest } from "./inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { scrapeUrl } from "./firecrawl";

// Builds the same search-engine query URLs QueryForm.tsx generates client-side
// (Bing/Yahoo/DuckDuckGo/Ecosia/Startpage), now fetched via Firecrawl instead of
// the retired Python backend.
// Keys must match the engine names sent from SearchEngineSelector.tsx exactly ("Bing", not "bing").
const ENGINE_URL_TEMPLATES: Record<string, (q: string) => string> = {
  Bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  Yahoo: (q) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
  DuckDuckGo: (q) => `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
  Ecosia: (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
  Startpage: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`,
};

export const runScrapeJob = inngest.createFunction(
  { id: "run-scrape-job", retries: 2, triggers: { event: "scrape/job.queued" } },
  async ({ event, step }) => {
    const { jobId, query, engines } = event.data as {
      jobId: string;
      query: string;
      engines: string[];
    };

    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase
        .from("scrape_jobs")
        .update({ status: "running", progress: { visited: 0, total: engines.length } })
        .eq("id", jobId);
    });

    const urls = engines
      .filter((engine) => ENGINE_URL_TEMPLATES[engine])
      .map((engine) => ENGINE_URL_TEMPLATES[engine](query));

    let visited = 0;
    const results = [];

    for (const url of urls) {
      const result = await step.run(`scrape-${url}`, () => scrapeUrl(url));
      results.push(result);
      visited += 1;

      await step.run(`progress-${visited}`, async () => {
        await supabase
          .from("scrape_jobs")
          .update({ progress: { visited, total: urls.length, current_url: url } })
          .eq("id", jobId);
      });
    }

    await step.run("mark-done", async () => {
      await supabase
        .from("scrape_jobs")
        .update({
          status: "done",
          finished_at: new Date().toISOString(),
          result_summary: { urls_visited: visited },
        })
        .eq("id", jobId);
    });

    return { jobId, visited };
  }
);
