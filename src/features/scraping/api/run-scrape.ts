import { inngest } from "./inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { searchWeb } from "./firecrawlSearch";
import { extractTenders, type ExtractedTender } from "@/features/tenders/api/firecrawlExtract";
import { classifyRejection, matchedKeywords, rejectionSummary, topicKeywordsFromQuery, type RejectionReason } from "@/features/tenders/api/sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields, type InsertedTenderSummary } from "@/features/tenders/api/tenderRow";
import { logRejectedTenders } from "@/features/tenders/api/rejectedTenders";
import { isJobCanceled } from "./jobStatus";
import { notifyTaskOwner } from "./notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";
import { mapWithConcurrency } from "@/shared/lib/concurrency";

const TENDER_TYPE = "Search Query Tenders";
const RESULTS_LIMIT = 10;
// Confirmed live (twice): Firecrawl's /v1/scrape and /v1/search endpoints each have their own
// ~18-27 req/min ceiling, and the job-level `throttle` config only limits how many *jobs* start
// per minute — it doesn't cap how many Firecrawl calls run concurrently once several jobs happen
// to be executing at the same time (e.g. several Weekly tasks all becoming due together). A
// single job's own bounded concurrency has to assume 2-3 sibling jobs could be making calls in
// the same window too, so this stays conservative rather than sized to what one job alone could
// get away with.
const MAX_CONCURRENT_EXTRACTS = 4;
// Skip re-extracting a URL that was already scraped within this many days — the tender content
// hasn't changed, and extract credits are the most expensive part of each run.
const RECENT_SCRAPE_WINDOW_DAYS = 7;
const MAX_CONCURRENT_SEARCHES = 4;
// A scheduled task can have several distinct search terms selected — each needs its own actual
// search (searching "term1 term2 term3" as one combined string dilutes relevance into a
// meaningless bag-of-words query). Multiple searches multiply Firecrawl usage though, so each
// term gets a smaller per-term result count, and the merged, deduped total across all of a
// task's terms is capped regardless of how many terms it has.
//
// Raised from 3: confirmed live that for narrower compound queries, the top 3 results are often
// entirely dominated by already-blocked tender-aggregator/social sites (tendersontime.com,
// facebook.com, scribd.com, ...), while genuine unblocked results (tenders.go.ke, government
// portals) rank 5th-10th and never got reached at all. This doesn't raise extraction cost
// proportionally — MULTI_QUERY_TOTAL_CAP still bounds what actually gets extracted, this just
// gives real results further down the rankings a chance to surface before that cap is applied.
const MULTI_QUERY_PER_TERM_LIMIT = 6;
const MULTI_QUERY_TOTAL_CAP = 15;

/** Extracts the bare hostname from a URL, stripping www. prefix for consistent matching. */
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Returns a reason string if the markdown content signals a blocked/gated page,
 * or null if the page looks legitimate.
 */
function detectBlockReason(markdown: string | null): string | null {
  if (!markdown || markdown.trim().length < 100) return "empty or near-empty response";
  const lower = markdown.toLowerCase();
  if (/sign in|log in|login required|please log in|create an account to|register to (view|access)|you must be (logged|signed)/i.test(lower)) return "login wall";
  if (/access denied|403 forbidden|you don't have permission|not authorized/i.test(lower)) return "access denied";
  if (/captcha|verify you are human|robot check|cloudflare ray id|enable javascript and cookies/i.test(lower)) return "CAPTCHA / bot protection";
  if (/subscribe to (view|access|read)|subscription required|premium content|upgrade your plan/i.test(lower)) return "paywall";
  return null;
}

export const runScrapeJob = inngest.createFunction(
  // Single attempt: a retry would just re-run the same slow multi-URL extraction from scratch.
  // The catch-all below guarantees the job always lands in a terminal status either way, instead
  // of getting stuck at "running" forever if something throws past the per-URL try/catch.
  // Shares the same Firecrawl account/quota as the other scrape jobs, so it's throttled the
  // same way to avoid contributing to 429 bursts (see run-source-scrape-job).
  { id: "run-scrape-job", retries: 0, triggers: { event: "scrape/job.queued" }, throttle: { limit: 3, period: "1m" } },
  async ({ event, step }) => {
    // `engines` is accepted for backward compatibility with older callers but no longer drives
    // behavior — Firecrawl's /search endpoint replaces per-engine SERP scraping entirely.
    // `query` (single string) is the ad-hoc Run Query path (/api/jobs) — unchanged, one search.
    // `queries` (array) is the scheduled multi-term path (startTaskRun.ts) — one search per term.
    const { jobId, query, queries, resultsLimit, countries } = event.data as {
      jobId: string;
      query?: string;
      queries?: string[];
      engines?: string[];
      resultsLimit?: number;
      countries?: string[];
    };
    const queryList = queries?.length ? queries : query ? [query] : [];
    const isMultiQuery = queryList.length > 1;
    // The label used in prompts/logging below — every term for multi-query, the single query otherwise.
    const queryLabel = queryList.join(", ");
    // Keyword backstop for the multi-query path: the topic phrases inside each search query
    // (see topicKeywordsFromQuery), not the full query strings.
    const topicTerms = [...new Set(queryList.flatMap(topicKeywordsFromQuery))];

    const supabase = createServerSupabaseClient();

    // Confirmed live: without the `.neq` guard here, a cancel that lands while the job is still
    // queued/starting gets silently overwritten back to "running" by this very step — cancellation
    // was previously only checked before the extract phase, leaving the search phase (often the
    // longest-running one, and the one most likely to be mid-flight when someone hits Cancel)
    // completely unable to be stopped.
    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "searching" } }).eq("id", jobId).neq("status", "canceled");
    });

    if (await step.run("check-canceled-before-search", () => isJobCanceled(supabase, jobId))) {
      return { jobId, tendersFound: 0, canceled: true };
    }

    try {
      const perQueryLimit = isMultiQuery ? MULTI_QUERY_PER_TERM_LIMIT : resultsLimit || RESULTS_LIMIT;
      const searchResults = await step.run("search", async () => {
        const batches = await mapWithConcurrency(queryList, MAX_CONCURRENT_SEARCHES, (q) => searchWeb(q, perQueryLimit));
        const seen = new Set<string>();
        const merged = batches.flat().filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
        return isMultiQuery ? merged.slice(0, MULTI_QUERY_TOTAL_CAP) : merged;
      });
      const results = searchResults;

      // Load blocked domains and filter out any search results whose hostname matches.
      const filteredResults = await step.run("filter-blocked", async () => {
        const { data } = await supabase
          .from("blocked_domains")
          .select("domain");
        const blocked = new Set((data ?? []).map((r: { domain: string }) => r.domain));
        const before = results.length;
        const allowed = results.filter((r) => {
          const host = extractHostname(r.url);
          return host && !blocked.has(host);
        });
        console.log(`[run-scrape] blocked filter: ${before - allowed.length} URL(s) skipped, ${allowed.length} remaining`);
        return allowed;
      });

      // Skip URLs already scraped recently — avoids burning extract credits on pages whose
      // content hasn't changed since the last run. Checked against `tenders.source_url` rather
      // than a separate cache table so it's always in sync with the live tender data with no
      // extra maintenance. The window matches the most common automation cadence (weekly), so
      // a URL scraped last Monday is fresh enough to skip this Monday but not next Monday.
      const dedupedResults = await step.run("filter-recently-scraped", async () => {
        const urls = filteredResults.map((r) => r.url);
        const cutoff = new Date(Date.now() - RECENT_SCRAPE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from("tenders")
          .select("source_url")
          .in("source_url", urls)
          .gte("scraped_at", cutoff);
        const recentUrls = new Set((data ?? []).map((r: { source_url: string }) => r.source_url));
        const fresh = filteredResults.filter((r) => !recentUrls.has(r.url));
        if (recentUrls.size > 0) {
          console.log(`[run-scrape] dedup: skipping ${recentUrls.size} URL(s) scraped within ${RECENT_SCRAPE_WINDOW_DAYS}d, ${fresh.length} remaining`);
        }
        return fresh;
      });

      // Skip URLs whose tender is already closed — closed tenders don't change, re-extracting
      // them burns credits for nothing.
      const closedUrlsArr = await step.run("filter-closed-tenders", async () => {
        const urls = dedupedResults.map((r) => r.url);
        const { data } = await supabase.from("tenders").select("source_url").in("source_url", urls).eq("status", "closed");
        return (data ?? []).map((r: { source_url: string }) => r.source_url);
      });
      const closedUrls = new Set<string>(closedUrlsArr);
      const freshResults = dedupedResults.filter((r) => !closedUrls.has(r.url));
      if (closedUrls.size > 0) {
        console.log(`[run-scrape] skipping ${closedUrls.size} URL(s) already closed`);
      }

      await step.run("progress-searched", async () => {
        await supabase.from("scrape_jobs").update({ progress: { visited: 0, total: freshResults.length, stage: "extracting" } }).eq("id", jobId);
      });

      if (await step.run("check-canceled-before-extract", () => isJobCanceled(supabase, jobId))) {
        return { jobId, visited: 0, tendersFound: 0, canceled: true };
      }

      // Load the allowlist once per job — URLs added here were manually recovered by a user and
      // bypass all rejection filters so future runs don't drop them again. step.run serializes
      // through JSON so we return a plain array and build the Set outside the step boundary.
      const allowlistArr = await step.run("load-allowlist", async () => {
        const { data } = await supabase.from("tender_allowlist").select("source_url");
        return (data ?? []).map((r: { source_url: string }) => r.source_url);
      });
      const allowlistedUrls = new Set<string>(allowlistArr);

      // If dedup + closed-filter removed everything, skip straight to done.
      if (freshResults.length === 0) {
        await step.run("mark-done-all-cached", async () => {
          await supabase
            .from("scrape_jobs")
            .update({
              status: "done",
              finished_at: new Date().toISOString(),
              result_summary: { urls_visited: 0, tendersFound: 0, totalTenders: 0, totalExtracted: 0, openTenders: 0, closedTenders: 0, urlsSkippedAsCached: filteredResults.length - closedUrls.size, urlsSkippedAsClosed: closedUrls.size, urlsSkipped: results.length - filteredResults.length },
            })
            .eq("id", jobId)
            .neq("status", "canceled");
        });
        await step.run("log-done-all-cached", () => logJobOutcome(supabase, jobId, `All URLs recently scraped or already closed — skipped to save credits.`));
        return { jobId, visited: 0, tendersFound: 0, allCached: true };
      }

      // Confirmed live: a tenderyetu detail page for one tender had a "Related posts:" footer
      // linking to a *different* tender by title elsewhere on the site — the model extracted that
      // linked title as a second real tender and invented an organization/URL for it from context
      // alone, since it had no actual page content about it. The explicit exclusion below is a
      // best-effort prompt-level defense; matchesSourceContent's organization check (sourceConfigs.ts)
      // is the deterministic backstop that actually catches it when the model doesn't comply.
      const prompt = `Extract any tender, RFP, RFQ, or procurement opportunity details from this page relevant to: "${queryLabel}". Only extract the tender(s) this page's own main content is actually about — never a tender you only see mentioned in a "related posts", "you may also like", navigation, or sidebar link to another page. Include title, closing/deadline date if shown, the full URL linking to the specific tender/notice, the direct document/PDF link if different, the issuing organization, a short category label, location, budget/value if stated, sector tag(s)/eligible-bidder/submission-language only if the page explicitly states them, and every distinct downloadable attachment (ToR, form, annexes) with its real filename if there's more than one.`;

      let visited = 0;
      let totalInserted = 0;
      let openCount = 0;
      let closedCount = 0;
      let totalExtracted = 0;
      const rejectionCounts: Record<RejectionReason, number> = { no_url: 0, country: 0, keywords: 0, source_content: 0 };
      const allRejected: { tender: ExtractedTender; reason: RejectionReason }[] = [];
      const insertedTenders: InsertedTenderSummary[] = [];

      // Extracted concurrently instead of one-at-a-time — this was the single biggest latency
      // cost in the whole pipeline (up to ~60s × 10 results run sequentially before) — but
      // bounded, not a full-width Promise.all, to stay under Firecrawl's per-minute rate limit.
      await mapWithConcurrency(freshResults, MAX_CONCURRENT_EXTRACTS, async (result) => {
          const { tenders: extracted, markdown } = await step.run(`extract-${result.url}`, async () => {
            try {
              return await extractTenders(result.url, prompt);
            } catch {
              return { tenders: [], markdown: null };
            }
          });

          // Auto-block domains that are gated, inaccessible, or return empty content.
          await step.run(`check-block-${result.url}`, async () => {
            const reason = detectBlockReason(markdown);
            if (!reason) return;
            const host = extractHostname(result.url);
            if (!host) return;
            await supabase.from("blocked_domains").upsert({ domain: host, reason }, { onConflict: "domain", ignoreDuplicates: true });
            console.log(`[run-scrape] auto-blocked ${host}: ${reason}`);
          });

          const { inserted, open, closed, rows: insertedRows, pageRejections, pageRejected } = await step.run(`save-${result.url}`, async () => {
            const pageRejections: Record<RejectionReason, number> = { no_url: 0, country: 0, keywords: 0, source_content: 0 };
            const pageRejected: { tender: ExtractedTender; reason: RejectionReason }[] = [];
            const rows = extracted.flatMap((t) => {
              // Search-time relevance (the query itself) is enough for the ad-hoc single-query
              // Run Query path, where queryList is one free-text phrase rather than a curated
              // term list — word-boundary matching that phrase against the tender would
              // over-reject. For the scheduled multi-query path, a search hit is often a general
              // aggregator page, so the topic phrases from each query (topicTerms) are the backstop.
              // They are not the full query strings, which would have to match a title verbatim
              // and rejected almost everything (137 keyword rejects on Oct 27 alone). Without this
              // backstop, unrelated tenders from an allowed country got saved (Oct 28: five Rwanda
              // procurement tenders under "Contact Centre, Sales & Workforce Outsourcing").
              const reason = classifyRejection(t, { countries, markdown, fallbackUrl: result.url, topicPhrases: isMultiQuery ? topicTerms : undefined, skipKeywords: true, allowlistedUrls });
              if (reason) {
                pageRejections[reason] += 1;
                pageRejected.push({ tender: t, reason });
                return [];
              }
              const matched = matchedKeywords(t, isMultiQuery ? topicTerms : queryList);
              return [
                {
                  title: t.title,
                  description: t.description || null,
                  closing_date: resolveClosingDate(t.closing_date),
                  source_url: t.source_url || result.url,
                  status: computeStatus(t.closing_date ?? null),
                  tender_type: TENDER_TYPE,
                  format: (t.source_url || result.url).toLowerCase().endsWith(".pdf") ? "PDF" : "HTML",
                  scraped_at: new Date().toISOString(),
                  raw_content: markdown,
                  job_id: jobId,
                  matched_keywords: matched.length ? matched : null,
                  ...resolveOptionalFields(t),
                },
              ];
            });

            const result_ = await insertTenderRows(supabase, rows);
            return { ...result_, pageRejections, pageRejected };
          });

          visited += 1;
          totalInserted += inserted;
          openCount += open;
          closedCount += closed;
          totalExtracted += extracted.length;
          allRejected.push(...pageRejected);
          (Object.keys(pageRejections) as RejectionReason[]).forEach((r) => (rejectionCounts[r] += pageRejections[r]));
          insertedTenders.push(...insertedRows);

          await step.run(`progress-${result.url}`, async () => {
            await supabase
              .from("scrape_jobs")
              .update({ progress: { visited, total: freshResults.length, current_url: result.url, stage: "extracting" } })
              .eq("id", jobId);
          });
      });

      // Confirmed live: a job canceled mid-extraction still had its already-found tenders emailed/
      // Slacked out, even though mark-done's own update correctly no-op'd (the `.neq` guard below)
      // and left result_summary/the UI's "items" count showing nothing — notify ran unconditionally
      // right after, using the in-memory results collected before cancellation was noticed, so the
      // DB row and the notification the user actually saw told two different stories. Notify (and
      // the "done" log line) now skip entirely once canceled, same as every other outcome here.
      if (await step.run("check-canceled-before-done", () => isJobCanceled(supabase, jobId))) {
        return { jobId, visited, tendersFound: totalInserted, canceled: true };
      }

      await step.run("log-rejected", () => logRejectedTenders(supabase, jobId, TENDER_TYPE, allRejected));

      await step.run("mark-done", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: {
              urls_visited: visited,
              tendersFound: totalInserted,
              totalTenders: totalInserted,
              totalExtracted,
              openTenders: openCount,
              closedTenders: closedCount,
              urlsSkipped: (results.length - filteredResults.length),
              urlsSkippedAsCached: filteredResults.length - dedupedResults.length,
              urlsSkippedAsClosed: closedUrls.size,
              passedFilters: totalExtracted - Object.values(rejectionCounts).reduce((a, b) => a + b, 0),
              droppedAsDuplicate: totalExtracted - Object.values(rejectionCounts).reduce((a, b) => a + b, 0) - totalInserted,
              ...(rejectionSummary(rejectionCounts) ? { rejectedBy: rejectionSummary(rejectionCounts) } : {}),
            },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });

      // Track per-term acceptance rate — for multi-query runs, attribute each inserted tender to
      // the terms it matched (matched_keywords). Single-query runs attribute all inserted tenders
      // to the one query. Rejection counts split evenly across terms as a best approximation.
      if (queryList.length > 0) {
        await step.run("update-term-performance", async () => {
          const now = new Date().toISOString();
          const totalRejections = Object.values(rejectionCounts).reduce((a, b) => a + b, 0);
          for (const term of queryList) {
            const termInserted = isMultiQuery
              ? insertedTenders.filter((t) => t.matched_keywords?.includes(term)).length
              : totalInserted;
            const termRejections = isMultiQuery
              ? Math.round(totalRejections / queryList.length)
              : totalRejections;
            const { data: existing } = await supabase
              .from("search_term_performance")
              .select("runs, total_found, total_rejected")
              .eq("term", term)
              .maybeSingle();
            await supabase.from("search_term_performance").upsert({
              term,
              runs: (existing?.runs ?? 0) + 1,
              total_found: (existing?.total_found ?? 0) + termInserted,
              total_rejected: (existing?.total_rejected ?? 0) + termRejections,
              last_run_at: now,
              updated_at: now,
            }, { onConflict: "term" });
          }
        });
      }

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, totalInserted, insertedTenders, "Web Search"));
      await step.run("log-done", () => logJobOutcome(supabase, jobId, `Run finished: ${totalInserted} tender(s) found.`));

      return { jobId, visited, tendersFound: totalInserted };
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
