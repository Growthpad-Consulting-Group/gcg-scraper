"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createBrowserSupabaseClient } from "@/shared/lib/supabase/client";
import type { ScrapeStatus, ScrapeSummary } from "@/features/scraping/types";

type JobRow = {
  id: string;
  kind?: string | null;
  status: "queued" | "running" | "done" | "error" | "canceled";
  // `stage` (and whatever else a non-search-query job attaches, e.g. `candidates`) only shows
  // up on tender-source/tender-website/lead jobs — search-query is the only kind that reports
  // per-URL visited/total/current_url progress.
  progress: { visited?: number; total?: number; current_url?: string; stage?: string } | null;
  result_summary: { urls_visited?: number; openTenders?: number; closedTenders?: number; totalTenders?: number; leadsFound?: number } | null;
};

const emptySummary: ScrapeSummary = {
  urlsVisited: 0,
  timeTaken: 0,
  openTenders: 0,
  closedTenders: 0,
  totalTenders: 0,
  leadsFound: 0,
  startTime: null,
};

// Replaces the old Socket.IO connection to the Python backend: subscribes to Postgres
// changes on the scrape_jobs row for this job via Supabase Realtime instead.
export default function useRealtimeJob(jobId: string | null) {
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [visitedUrls, setVisitedUrls] = useState<string[]>([]);
  const [totalUrlsToVisit, setTotalUrlsToVisit] = useState(0);
  const [jobKind, setJobKind] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScrapeSummary>(emptySummary);
  const [showSummary, setShowSummary] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) return;

    startTimeRef.current = Date.now();
    setScrapeStatus("running");

    const supabase = createBrowserSupabaseClient();

    const applyRow = (row: JobRow) => {
      const visited = row.progress?.visited ?? 0;
      const total = row.progress?.total ?? 0;
      setTotalUrlsToVisit(total);
      setProgress(total > 0 ? Math.min(100, Math.round((visited / total) * 100)) : 0);
      if (row.progress?.current_url) {
        setVisitedUrls((prev) => (prev.includes(row.progress!.current_url!) ? prev : [...prev, row.progress!.current_url!]).slice(-5));
      }
      if (row.kind) setJobKind(row.kind);
      setStage(row.progress?.stage ?? null);

      if (row.status === "done") {
        const timeTaken = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;
        setSummary({
          urlsVisited: row.result_summary?.urls_visited ?? visited,
          timeTaken,
          openTenders: row.result_summary?.openTenders ?? 0,
          closedTenders: row.result_summary?.closedTenders ?? 0,
          totalTenders: row.result_summary?.totalTenders ?? 0,
          leadsFound: row.result_summary?.leadsFound ?? 0,
          startTime: startTimeRef.current,
        });
        setScrapeStatus("complete");
        setShowSummary(true);
        setProgress(100);
        toast.success("Scraping completed!", { id: "scrape-complete", duration: 3000 });
      } else if (row.status === "error") {
        setScrapeStatus("error");
        toast.error("Scraping failed.");
      } else if (row.status === "canceled") {
        setScrapeStatus("canceled");
        setShowSummary(true);
        toast.success("Scraping canceled", { duration: 3000 });
      }
    };

    const channel = supabase
      .channel(`scrape_jobs:${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "scrape_jobs", filter: `id=eq.${jobId}` }, (payload) => {
        applyRow(payload.new as JobRow);
      })
      .subscribe();

    // Fetch initial state in case the job already progressed before the subscription connected.
    supabase
      .from("scrape_jobs")
      .select("id, kind, status, progress, result_summary")
      .eq("id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) applyRow(data as JobRow);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const reset = () => {
    setScrapeStatus("idle");
    setProgress(0);
    setVisitedUrls([]);
    setTotalUrlsToVisit(0);
    setJobKind(null);
    setStage(null);
    setSummary(emptySummary);
  };

  return {
    scrapeStatus,
    setScrapeStatus,
    progress,
    visitedUrls,
    totalUrlsToVisit,
    jobKind,
    stage,
    summary,
    setSummary,
    showSummary,
    setShowSummary,
    reset,
  };
}
