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
  isCanceling,
  handleCancelScrape,
  taskId,
  mode,
}: {
  scrapeStatus: ScrapeStatus;
  progress: number;
  visitedUrls: string[];
  totalUrlsToVisit: number;
  isCanceling: boolean;
  handleCancelScrape: () => void;
  taskId: string | null;
  mode?: "light" | "dark";
}) {
  const lines: LogLine[] = [];
  if (taskId) lines.push({ text: `job ${taskId}`, tone: "info" });
  if (scrapeStatus === "idle") lines.push({ text: "waiting to start…", tone: "default" });
  if (scrapeStatus !== "idle") lines.push({ text: `[ ${scrapeStatus.toUpperCase()} ] ${totalUrlsToVisit} results queued`, tone: "info" });
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
