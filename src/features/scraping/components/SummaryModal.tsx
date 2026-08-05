"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";
import type { ScrapeStatus, ScrapeSummary } from "@/features/scraping/types";

function getTimeDifference(startTimeValue: number | null) {
  if (!startTimeValue) return "Just now";
  const now = Date.now();
  const diff = now - new Date(startTimeValue).getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function formatScanDate(timestamp: number | null) {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeTaken(seconds: number) {
  if (!seconds || seconds < 0) return "N/A";
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (remainingSeconds || parts.length === 0) parts.push(`${remainingSeconds}s`);
  return parts.join(" ");
}

export default function SummaryModal({
  isOpen,
  onClose,
  summary,
  scrapeStatus,
  startTime,
  kind = "tenders",
  resultsHref,
}: {
  isOpen: boolean;
  onClose: () => void;
  summary: ScrapeSummary;
  mode?: "light" | "dark";
  scrapeStatus: ScrapeStatus;
  startTime: number | null;
  taskId?: string | number | null;
  /** Which result stats to show — tender scrapes report open/closed/total tenders, lead searches just report a count. */
  kind?: "tenders" | "leads";
  /** Where "View results" should send you — omitted when there's nothing worth viewing. */
  resultsHref?: string;
}) {
  const [timeDifference, setTimeDifference] = useState<string | null>(null);

  useEffect(() => {
    const effectiveStartTime = startTime || Date.now();
    const updateTime = () => setTimeDifference(getTimeDifference(effectiveStartTime));
    updateTime();
    const intervalId = setInterval(updateTime, 60000);
    return () => clearInterval(intervalId);
  }, [startTime]);

  if (!isOpen) return null;

  const hasResults = kind === "leads" ? summary.leadsFound > 0 : summary.openTenders > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-opacity duration-200">
      <div className="w-[90%] max-w-2xl rounded-xl border border-app-border bg-surface p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between border-b border-app-border pb-3">
          <div className="flex items-center gap-2">
            <Icon
              icon={scrapeStatus === "canceled" ? "solar:close-circle-broken" : "solar:info-circle-broken"}
              width={22}
              height={22}
              className={scrapeStatus === "canceled" ? "text-text-lo" : "text-brand-500"}
            />
            <h3 className="text-lg font-semibold text-text-hi">{scrapeStatus === "canceled" ? "Scan Canceled" : "Run Summary"}</h3>
            {scrapeStatus === "complete" && (
              <span className="ml-2 flex items-center gap-1 text-sm text-text-lo">
                <p>{timeDifference || "Just now"}</p>
                <p className="text-xs">{`(${formatScanDate(startTime)})`}</p>
              </span>
            )}
          </div>

          <button onClick={onClose} aria-label="Close modal" className="text-text-lo hover:text-text-hi">
            <Icon icon="solar:close-circle-broken" width={22} height={22} />
          </button>
        </div>

        {scrapeStatus === "canceled" ? (
          <div className="space-y-4">
            <p className="text-sm text-text-lo">The scan was interrupted by the user.</p>
            <SummaryItem icon="solar:clock-circle-broken" label="Time Taken" value={formatTimeTaken(summary.timeTaken)} />
          </div>
        ) : kind === "leads" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryItem icon="solar:users-group-rounded-broken" label="Leads Found" value={summary.leadsFound} iconColor="text-status-success" />
            <SummaryItem icon="solar:clock-circle-broken" label="Time Taken" value={formatTimeTaken(summary.timeTaken)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <SummaryItem icon="solar:link-broken" label="URLs Visited" value={summary.urlsVisited} />
            <SummaryItem icon="solar:clock-circle-broken" label="Time Taken" value={formatTimeTaken(summary.timeTaken)} />
            <SummaryItem icon="solar:check-circle-broken" label="Open Tenders" value={summary.openTenders} iconColor="text-status-success" />
            <SummaryItem icon="solar:close-circle-broken" label="Closed Tenders" value={summary.closedTenders} iconColor="text-status-danger" />
            <SummaryItem icon="solar:folder-broken" label="Total Tenders" value={summary.totalTenders} />
          </div>
        )}

        <div className="flex justify-center gap-3 pt-2">
          {hasResults && resultsHref ? (
            <>
              <Link href={resultsHref} className="w-full">
                <Button variant="secondary" className="mt-6 w-full">
                  <Icon icon="solar:widget-2-broken" width={18} />
                  View {kind === "leads" ? "Leads" : "Tenders"}
                </Button>
              </Link>
              <Button onClick={onClose} className="mt-6 w-full">
                <Icon icon="solar:close-circle-broken" width={18} />
                Close
              </Button>
            </>
          ) : (
            <Button onClick={onClose} className="mt-6 w-full">
              <Icon icon="solar:close-circle-broken" width={18} />
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  iconColor = "text-brand-500",
}: {
  icon: string;
  label: string;
  value: string | number;
  iconColor?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-surface-2 p-4 text-center transition-all duration-300 hover:-translate-y-1">
      <Icon icon={icon} width={32} height={32} className={`mb-2 ${iconColor}`} />
      <p className="text-sm font-medium text-text-lo">{label}</p>
      <p className="text-lg font-bold text-text-hi">{value}</p>
    </div>
  );
}
