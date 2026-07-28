import { serve } from "inngest/next";
import { inngest } from "@/features/scraping/api/inngest-client";
import { runScrapeJob } from "@/features/scraping/api/run-scrape";
import { runGmbScrapeJob } from "@/features/leads/api/run-gmb-scrape";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runScrapeJob, runGmbScrapeJob],
});
