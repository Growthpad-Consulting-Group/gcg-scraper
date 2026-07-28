import { serve } from "inngest/next";
import { inngest } from "@/features/scraping/api/inngest-client";
import { runScrapeJob } from "@/features/scraping/api/run-scrape";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runScrapeJob],
});
