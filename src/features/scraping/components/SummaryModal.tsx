"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
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
  mode,
  scrapeStatus,
  startTime,
}: {
  isOpen: boolean;
  onClose: () => void;
  summary: ScrapeSummary;
  mode: "light" | "dark";
  scrapeStatus: ScrapeStatus;
  startTime: number | null;
  taskId?: string | number | null;
}) {
  const isDark = mode === "dark";
  const [timeDifference, setTimeDifference] = useState<string | null>(null);

  useEffect(() => {
    const effectiveStartTime = startTime || Date.now();
    const updateTime = () => setTimeDifference(getTimeDifference(effectiveStartTime));
    updateTime();
    const intervalId = setInterval(updateTime, 60000);
    return () => clearInterval(intervalId);
  }, [startTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center transition-opacity duration-200">
      <div className={`p-6 rounded-xl shadow-xl max-w-2xl w-[90%] transform transition-all duration-300 ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
        <div className="flex items-center justify-between mb-6 border-b pb-3 border-gray-300 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Icon
              icon={scrapeStatus === "canceled" ? "mdi:cancel" : "mdi:information-outline"}
              width="24"
              height="24"
              className={scrapeStatus === "canceled" ? "text-[#231812]" : "text-[#f05d23]"}
            />
            <h3 className="text-xl font-bold">{scrapeStatus === "canceled" ? "Scan Canceled" : "Search Summary"}</h3>
            {scrapeStatus === "complete" && (
              <span className="flex items-center gap-1 text-sm text-gray-500 ml-2">
                <p>{timeDifference || "Just now"}</p>
                <p className="text-xs">{`(${formatScanDate(startTime)})`}</p>
              </span>
            )}
          </div>

          <button onClick={onClose} aria-label="Close modal" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>

        {scrapeStatus === "canceled" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">The scan was interrupted by the user.</p>
            <SummaryItem mode={mode} icon="mdi:clock-outline" label="Time Taken" value={formatTimeTaken(summary.timeTaken)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <SummaryItem mode={mode} icon="mdi:link" label="URLs Visited" value={summary.urlsVisited} />
            <SummaryItem mode={mode} icon="mdi:clock-outline" label="Time Taken" value={formatTimeTaken(summary.timeTaken)} />
            <SummaryItem mode={mode} icon="mdi:check-circle-outline" label="Open Tenders" value={summary.openTenders} iconColor="text-green-500" />
            <SummaryItem mode={mode} icon="mdi:close-circle-outline" label="Closed Tenders" value={summary.closedTenders} iconColor="text-red-500" />
            <SummaryItem mode={mode} icon="mdi:folder-outline" label="Total Tenders" value={summary.totalTenders} />
          </div>
        )}

        <div className="flex justify-center gap-6 py-2">
          {summary.openTenders > 0 ? (
            <>
              <Link href="/tenders" className="w-full">
                <button className="mt-6 w-full py-2 flex items-center justify-center gap-2 text-center rounded-lg bg-gray-400 text-white font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f05d23]">
                  <Icon icon="mdi:table" width="20" height="20" />
                  View Tenders
                </button>
              </Link>
              <button onClick={onClose} className="mt-6 w-full py-2 flex items-center justify-center gap-2 text-center rounded-lg bg-[#f05d23] text-white font-medium hover:bg-[#d04e1e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f05d23]">
                <Icon icon="mdi:close-circle-outline" width="20" height="20" />
                Close
              </button>
            </>
          ) : (
            <button onClick={onClose} className="mt-6 w-full py-2 flex items-center justify-center gap-2 text-center rounded-lg bg-[#f05d23] text-white font-medium hover:bg-[#d04e1e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f05d23]">
              <Icon icon="mdi:close-circle-outline" width="20" height="20" />
              Close
            </button>
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
  iconColor = "text-[#f05d23]",
  mode,
}: {
  icon: string;
  label: string;
  value: string | number;
  iconColor?: string;
  mode: "light" | "dark";
}) {
  const isDark = mode === "dark";
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-lg text-center shadow-sm transform transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"}`}>
      <Icon icon={icon} width="40" height="40" className={`mb-2 ${iconColor}`} />
      <p className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{label}</p>
      <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
