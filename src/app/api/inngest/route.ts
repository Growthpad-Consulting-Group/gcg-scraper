import { serve } from "inngest/next";
import { inngest } from "@/features/scraping/api/inngest-client";
import { runScrapeJob } from "@/features/scraping/api/run-scrape";
import { runGmbScrapeJob } from "@/features/leads/api/run-gmb-scrape";
import { runLinkedInScrapeJob } from "@/features/leads/api/run-linkedin-scrape";
import { runSourceScrapeJob } from "@/features/tenders/api/run-source-scrape";
import { runLinkedInTendersScrapeJob } from "@/features/tenders/api/run-linkedin-tenders-scrape";
import { runWebsiteScrapeJob } from "@/features/tenders/api/run-website-scrape";
import { runDocumentParseJob } from "@/features/tenders/api/run-document-parse";
import { checkScheduledTasksJob } from "@/features/scheduler/api/check-scheduled-tasks";
import { sendClosingRemindersJob } from "@/features/tenders/api/send-closing-reminders";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    runScrapeJob,
    runGmbScrapeJob,
    runLinkedInScrapeJob,
    runSourceScrapeJob,
    runLinkedInTendersScrapeJob,
    runWebsiteScrapeJob,
    runDocumentParseJob,
    checkScheduledTasksJob,
    sendClosingRemindersJob,
  ],
});
