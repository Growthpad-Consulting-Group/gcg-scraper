import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getRunStatus, getDatasetItems, abortRun } from "./apify";
import { startRedditSearch } from "./apifyReddit";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";

const MAX_POLLS = 40; // ~10 minutes at 15s apart

export const runRedditScrapeJob = inngest.createFunction(
  { id: "run-reddit-scrape-job", retries: 1, triggers: { event: "leads/reddit.queued" } },
  async ({ event, step }) => {
    const { jobId, searchQuery, maxResults } = event.data as { jobId: string; searchQuery: string; maxResults?: number };
    const supabase = createServerSupabaseClient();

    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "starting" } }).eq("id", jobId).neq("status", "canceled");
    });

    const { runId, datasetId, apiKey } = await step.run("start-apify-run", () => (maxResults ? startRedditSearch(searchQuery, maxResults) : startRedditSearch(searchQuery)));

    let status: string = "RUNNING";
    for (let i = 0; i < MAX_POLLS; i++) {
      if (await step.run(`check-canceled-${i}`, () => isJobCanceled(supabase, jobId))) {
        await step.run("abort-apify-run", () => abortRun(runId, apiKey));
        return { jobId, leadsFound: 0, status: "canceled" };
      }

      status = await step.run(`poll-${i}`, () => getRunStatus(runId, apiKey));
      if (status !== "RUNNING" && status !== "READY") break;

      await step.run(`progress-${i}`, async () => {
        await supabase.from("scrape_jobs").update({ progress: { stage: "running", pollCount: i + 1 } }).eq("id", jobId);
      });
      await step.sleep(`wait-${i}`, "15s");
    }

    if (status !== "SUCCEEDED") {
      await step.run("mark-done-no-results", async () => {
        await supabase
          .from("scrape_jobs")
          .update({ status: "done", finished_at: new Date().toISOString(), result_summary: { leadsFound: 0, apifyStatus: status } })
          .eq("id", jobId)
          .neq("status", "canceled");
      });
      return { jobId, leadsFound: 0, apifyStatus: status };
    }

    const posts = await step.run("fetch-dataset", () => getDatasetItems(datasetId, apiKey));

    const inserted = await step.run("save-leads", async () => {
      const postsOnly = posts.filter((p: any) => p.dataType === "post" || p.title);
      if (postsOnly.length === 0) return 0;
      const rows = postsOnly.map((post: any) => ({
        job_id: jobId,
        title: post.title,
        subreddit: post.parsedCommunityName || post.communityName || null,
        author: post.username || null,
        post_url: post.url || post.link || null,
        upvotes: post.upVotes ?? null,
        num_comments: post.numberOfComments ?? null,
        posted_at: post.createdAt || null,
        matched_keyword: searchQuery,
        search_query: searchQuery,
        raw: post,
      }));
      const { error } = await supabase.from("reddit_leads").insert(rows);
      if (error) throw error;
      return rows.length;
    });

    await step.run("mark-done", async () => {
      await supabase
        .from("scrape_jobs")
        .update({ status: "done", finished_at: new Date().toISOString(), result_summary: { leadsFound: inserted } })
        .eq("id", jobId)
        .neq("status", "canceled");
    });

    return { jobId, leadsFound: inserted };
  }
);
