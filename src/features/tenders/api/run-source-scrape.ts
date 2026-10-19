import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { extractTenders, extractTendersFromMarkdown } from "./firecrawlExtract";
import { fetchPpipTenders } from "./ppipApi";
import { fetchReliefwebTenders } from "./reliefwebApi";
import { fetchTedTenders } from "./tedApi";
import { getSourceConfig, buildRelevanceClause, classifyRejection, matchedKeywords, rejectionSummary, type RejectionReason } from "./sourceConfigs";
import { computeStatus, resolveClosingDate, insertTenderRows, resolveOptionalFields } from "./tenderRow";
import { parseTenderDocuments } from "./parseTenderDocuments";
import { logRejectedTenders } from "./rejectedTenders";
import { notifyTaskOwner } from "@/features/scraping/api/notify";
import { logJobOutcome } from "@/features/scheduler/api/taskLog";
import { isJobCanceled } from "@/features/scraping/api/jobStatus";

export const runSourceScrapeJob = inngest.createFunction(
  {
    id: "run-source-scrape-job",
    retries: 0,
    triggers: { event: "tenders/source.queued" },
    // Scheduled sources all fire within the same cron tick, which was bursting past Firecrawl's
    // per-minute rate limit (429s on PPIP/Treasury/UNDP). Throttle to spread calls out instead.
    throttle: { limit: 3, period: "1m" },
  },
  async ({ event, step }) => {
    const { jobId, tenderType, keywords, countries } = event.data as {
      jobId: string;
      tenderType: string;
      keywords?: string[];
      countries?: string[];
    };
    const supabase = createServerSupabaseClient();
    const config = getSourceConfig(tenderType);

    if (!config) {
      await step.run("mark-error-unknown-source", async () => {
        await supabase.from("scrape_jobs").update({ status: "error", finished_at: new Date().toISOString(), result_summary: { error: `Unknown tender source: ${tenderType}` } }).eq("id", jobId);
      });
      return { jobId, error: "unknown_source" };
    }

    // `.neq` guard: without it, a cancel landing while the job is still queued/starting gets
    // silently overwritten back to "running" by this very step (confirmed live elsewhere).
    await step.run("mark-running", async () => {
      await supabase.from("scrape_jobs").update({ status: "running", progress: { stage: "extracting" } }).eq("id", jobId).neq("status", "canceled");
    });

    if (await step.run("check-canceled-before-extract", () => isJobCanceled(supabase, jobId))) {
      return { jobId, tendersFound: 0, canceled: true };
    }

    try {
      // PPIP's listing page has no real per-tender links for the LLM to extract (confirmed
      // live: a fabricated source_url made it into the DB) — its own JSON API gives real
      // numeric ids and structured fields instead, so it skips the scrape+extract path entirely.
      // ReliefWeb Jobs similarly moved off the scraped+LLM-extracted page to ReliefWeb's own API
      // (real closing dates/org names/URLs, no risk of the model inventing a listing from a
      // sidebar link — see #446's post-mortem in sourceConfigs.ts's matchesSourceContent).
      // Check for a recently-scraped raw_content from this source — if found and GROQ is
      // configured, extract from cache to save one scrape credit per run.
      const cachedMarkdownArr = await step.run("check-cached-markdown", async () => {
        if (["PPIP", "ReliefWeb Jobs", "TED"].includes(tenderType)) return [] as string[];
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from("tenders")
          .select("raw_content")
          .eq("tender_type", tenderType)
          .gte("scraped_at", cutoff)
          .not("raw_content", "is", null)
          .limit(1);
        return (data ?? []).map((r: { raw_content: string }) => r.raw_content).filter(Boolean) as string[];
      });
      const cachedMarkdown = cachedMarkdownArr[0] ?? null;

      const { tenders: extracted, markdown } = await step.run("extract", () => {
        if (tenderType === "PPIP") return fetchPpipTenders();
        if (tenderType === "ReliefWeb Jobs") return fetchReliefwebTenders();
        if (tenderType === "TED") return fetchTedTenders();
        const relevanceClause = buildRelevanceClause(keywords, countries);
        const prompt = relevanceClause ? `${config.prompt} ${relevanceClause}` : config.prompt;
        // Use cached markdown if available — saves one scrape credit (no re-fetch of the URL)
        if (cachedMarkdown && process.env.GROQ_API_KEY) {
          return extractTendersFromMarkdown(cachedMarkdown, prompt).catch(() =>
            extractTenders(config.url, prompt, { waitFor: config.waitFor, timeout: config.timeout, proxy: config.proxy })
          );
        }
        return extractTenders(config.url, prompt, { waitFor: config.waitFor, timeout: config.timeout, proxy: config.proxy });
      });

      // Skip source_url values already scraped within the source's dedup window — avoids
      // re-classifying and re-inserting the same listings on every run for slow-posting sources.
      // step.run serializes through JSON so we return an array and build the Set outside.
      const dedupWindowDays = config.dedupWindowDays ?? 7;
      const recentUrlsArr = await step.run("filter-recently-scraped", async () => {
        const urls = extracted.map((t) => t.source_url).filter(Boolean) as string[];
        if (urls.length === 0) return [] as string[];
        const cutoff = new Date(Date.now() - dedupWindowDays * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase.from("tenders").select("source_url").in("source_url", urls).gte("scraped_at", cutoff);
        return (data ?? []).map((r: { source_url: string }) => r.source_url);
      });
      const recentUrls = new Set<string>(recentUrlsArr);
      const freshExtracted = extracted.filter((t) => !t.source_url || !recentUrls.has(t.source_url));

      // Load the allowlist once per job — URLs added here were manually recovered and bypass all
      // rejection filters so future runs don't drop the same tender again. step.run serializes
      // through JSON so we return a plain array and build the Set outside the step boundary.
      const allowlistArr = await step.run("load-allowlist", async () => {
        const { data } = await supabase.from("tender_allowlist").select("source_url");
        return (data ?? []).map((r: { source_url: string }) => r.source_url);
      });
      const allowlistedUrls = new Set<string>(allowlistArr);

      const { inserted, open: openCount, closed: closedCount, rows: insertedTenders, rejectionCounts, rejected } = await step.run("save-tenders", async () => {
        const rejectionCounts: Record<RejectionReason, number> = { no_url: 0, country: 0, keywords: 0, source_content: 0 };
        const rejected: { tender: typeof extracted[number]; reason: RejectionReason }[] = [];
        const rows = freshExtracted.flatMap((t) => {
          const reason = classifyRejection(t, { keywords, countries, markdown, allowlistedUrls });
          if (reason) {
            rejectionCounts[reason] += 1;
            rejected.push({ tender: t, reason });
            return [];
          }
          const matched = matchedKeywords(t, keywords);
          return [
            {
              title: t.title,
              description: t.description || null,
              closing_date: resolveClosingDate(t.closing_date, config.dateFormat),
              source_url: t.source_url as string,
              status: computeStatus(t.closing_date ?? null, config.dateFormat),
              tender_type: tenderType,
              format: t.source_url?.toLowerCase().endsWith(".pdf") ? "PDF" : t.source_url?.toLowerCase().endsWith(".docx") ? "DOCX" : "HTML",
              scraped_at: new Date().toISOString(),
              raw_content: markdown,
              job_id: jobId,
              matched_keywords: matched.length ? matched : null,
              ...resolveOptionalFields(t),
              ...(config.skipBudget ? { budget: null } : {}),
            },
          ];
        });

        const result = await insertTenderRows(supabase, rows);
        return { ...result, rejectionCounts, rejected };
      });

      await step.run("log-rejected", () => logRejectedTenders(supabase, jobId, tenderType, rejected));

      // Parse PDF attachments for newly inserted tenders — skips already-parsed URLs so re-runs
      // are free. Only fires when tenders were actually inserted to avoid wasting scrape credits.
      if (inserted > 0) {
        await step.run("parse-documents", async () => {
          const ids = insertedTenders.map((t) => t.id);
          const { data: tendersWithAttachments } = await supabase
            .from("tenders")
            .select("id, attachments")
            .in("id", ids)
            .not("attachments", "is", null);
          await parseTenderDocuments(supabase, tendersWithAttachments ?? []);
        });
      }

      const passedFilters = freshExtracted.length - Object.values(rejectionCounts).reduce((a, b) => a + b, 0);

      await step.run("mark-done", async () => {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            result_summary: {
              tendersFound: inserted,
              totalTenders: inserted,
              totalExtracted: extracted.length,
              urlsSkippedAsRecent: recentUrlsArr.length,
              openTenders: openCount,
              closedTenders: closedCount,
              passedFilters,
              droppedAsDuplicate: passedFilters - inserted,
              ...(rejectionSummary(rejectionCounts) ? { rejectedBy: rejectionSummary(rejectionCounts) } : {}),
            },
          })
          .eq("id", jobId)
          .neq("status", "canceled");
      });

      await step.run("notify", () => notifyTaskOwner(supabase, jobId, inserted, insertedTenders, tenderType));
      await step.run("log-done", () => logJobOutcome(supabase, jobId, `Run finished: ${inserted} tender(s) found.`));

      await step.run("upsert-source-health", async () => {
        const prev = await supabase.from("source_health").select("consecutive_zero_runs").eq("tender_type", tenderType).maybeSingle();
        const prevZeros = prev.data?.consecutive_zero_runs ?? 0;
        await supabase.from("source_health").upsert({
          tender_type: tenderType,
          last_run_at: new Date().toISOString(),
          last_tender_count: inserted,
          last_status: "done",
          consecutive_zero_runs: inserted === 0 ? prevZeros + 1 : 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tender_type" });
      });

      return { jobId, tendersFound: inserted };
    } catch (err: any) {
      await step.run("mark-error", async () => {
        await supabase
          .from("scrape_jobs")
          .update({ status: "error", finished_at: new Date().toISOString(), result_summary: { error: err?.message ?? "Unknown error" } })
          .eq("id", jobId)
          .neq("status", "canceled");
      });
      await step.run("log-error", () => logJobOutcome(supabase, jobId, `Run failed: ${err?.message ?? "Unknown error"}`));
      await step.run("upsert-source-health-error", async () => {
        const prev = await supabase.from("source_health").select("consecutive_zero_runs").eq("tender_type", tenderType).maybeSingle();
        const prevZeros = prev.data?.consecutive_zero_runs ?? 0;
        await supabase.from("source_health").upsert({
          tender_type: tenderType,
          last_run_at: new Date().toISOString(),
          last_tender_count: 0,
          last_status: "error",
          consecutive_zero_runs: prevZeros + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tender_type" });
      });
      throw err;
    }
  }
);
