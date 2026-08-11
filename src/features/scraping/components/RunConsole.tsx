"use client";

import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import GlassPanel from "@/shared/ui/GlassPanel";
import LogPanel, { LogLine } from "@/shared/ui/LogPanel";
import type { ScrapeStatus } from "@/features/scraping/types";

const STATUS_BADGE: Record<ScrapeStatus, { label: string; status: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  idle: { label: "idle", status: "neutral" },
  running: { label: "running", status: "warning" },
  complete: { label: "done", status: "success" },
  error: { label: "error", status: "danger" },
  canceled: { label: "canceled", status: "neutral" },
};

/** Live terminal-style console for Run Query (docs/UI_REDESIGN.md §7): queued → running → item-by-item → done. */
export default function RunConsole({
  scrapeStatus,
  progress,
  visitedUrls,
  totalUrlsToVisit,
  jobKind,
  stage,
  isCanceling,
  handleCancelScrape,
  taskId,
  mode,
}: {
  scrapeStatus: ScrapeStatus;
  progress: number;
  visitedUrls: string[];
  totalUrlsToVisit: number;
  /** search-query is the only kind with per-URL visited/total progress to show — everything
   * else (tender-source, tender-website, gmb-leads, linkedin-leads) only ever reports a `stage`
   * string, so this decides which of the two progress styles below applies. */
  jobKind?: string | null;
  stage?: string | null;
  isCanceling: boolean;
  handleCancelScrape: () => void;
  taskId: string | null;
  mode?: "light" | "dark";
}) {
  const isUrlVisitingJob = !jobKind || jobKind === "search-query";

  const lines: LogLine[] = [];
  if (taskId) lines.push({ text: `job ${taskId}`, tone: "info" });
  if (jobKind) lines.push({ text: `kind: ${jobKind}`, tone: "default" });
  if (scrapeStatus === "idle") lines.push({ text: "waiting to start…", tone: "default" });
  if (scrapeStatus !== "idle") {
    lines.push({
      text: isUrlVisitingJob ? `[ ${scrapeStatus.toUpperCase()} ] ${totalUrlsToVisit} results queued` : `[ ${scrapeStatus.toUpperCase()} ]`,
      tone: "info",
    });
  }
  // Non-URL-visiting jobs have no incremental count to show — the stage name ("searching",
  // "extracting", ...) is the only signal there is while running, same as the Overview
  // dashboard's expanded job panel.
  if (!isUrlVisitingJob && scrapeStatus === "running") lines.push({ text: `stage: ${stage ?? "running"}`, tone: "default" });
  visitedUrls.forEach((url) => lines.push({ text: `[ 200 OK ] ${url}`, tone: "success" }));
  if (scrapeStatus === "complete") lines.push({ text: "[ DONE ] scrape completed", tone: "success" });
  if (scrapeStatus === "error") lines.push({ text: "[ FAILED ] scrape errored — see toast for details", tone: "danger" });
  if (scrapeStatus === "canceled") lines.push({ text: "[ CANCELED ]", tone: "warning" });

  return (
    <GlassPanel mode={mode} className="flex h-full flex-col gap-3 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <Badge status={STATUS_BADGE[scrapeStatus].status}>{STATUS_BADGE[scrapeStatus].label}</Badge>
        {scrapeStatus === "running" && (
          <Button size="sm" variant="danger" onClick={handleCancelScrape} disabled={isCanceling}>
            {isCanceling ? "Canceling…" : "Cancel"}
          </Button>
        )}
      </div>

      {totalUrlsToVisit > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[11px] text-text-lo">
            {visitedUrls.length}/{totalUrlsToVisit}
          </span>
        </div>
      )}

      <LogPanel lines={lines} className="flex-1" />
    </GlassPanel>
  );
}
