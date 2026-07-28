"use client";

import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ScrapeStatus } from "@/features/scraping/types";

function getTimeDifference(startTimeValue: number | string | null) {
  if (!startTimeValue) return "Just now";
  const now = Date.now();
  const startDate = new Date(startTimeValue).getTime();
  const diff = now - startDate;

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

function formatScanDate(timestamp: number | string | null) {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateUrl(url: string, maxLength = 80) {
  if (!url) return "";
  if (url.length <= maxLength) return url;
  return `${url.substring(0, maxLength - 20)}...${url.substring(url.length - 15)}`;
}

export default function ScrapingStatus({
  scrapeStatus,
  progress,
  visitedUrls,
  tenders,
  isCanceling,
  handleCancelScrape,
  setShowSummary,
  mode,
  completedSearchEngines,
  startTime,
  totalUrlsToVisit,
}: {
  scrapeStatus: ScrapeStatus;
  progress: number;
  visitedUrls: string[];
  tenders: unknown[];
  isCanceling: boolean;
  handleCancelScrape: () => void;
  setShowSummary: (show: boolean) => void;
  mode: "light" | "dark";
  completedSearchEngines: string[];
  startTime: number | null;
  totalUrlsToVisit: number;
  taskId?: string | number | null;
}) {
  const router = useRouter();
  const isDark = mode === "dark";
  const [timeDifference, setTimeDifference] = useState<string | null>(null);

  useEffect(() => {
    if (!startTime) return;
    const updateTime = () => setTimeDifference(getTimeDifference(startTime));
    updateTime();
    const intervalId = setInterval(updateTime, 60000);
    return () => clearInterval(intervalId);
  }, [startTime]);

  return (
    <div
      className={`p-6 rounded-xl shadow-md hover:shadow-none animate-fade-in transition-shadow duration-500 border-t-4 border-[#f05d23] ${
        isDark ? "bg-gray-800 text-white" : "bg-white text-[#231812]"
      } flex flex-col justify-between h-full`}
    >
      <div className="space-y-6">
        {scrapeStatus === "idle" && (
          <div className="flex items-center gap-2">
            <Icon icon="mdi:information" width="24" height="24" className="text-[#f05d23]" />
            <p className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>No scan started</p>
          </div>
        )}

        {scrapeStatus === "running" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:progress-clock" width="24" height="24" className="text-[#f05d23]" />
              <p className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>Scraping in Progress</p>
            </div>

            <div className={`w-full bg-gray-200 rounded-full h-4 ${isDark ? "bg-gray-700" : ""}`}>
              <div className="bg-[#f05d23] h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {progress}% complete
              {totalUrlsToVisit > 0 && <span> (Visited {visitedUrls.length} of {totalUrlsToVisit} URLs)</span>}
            </p>

            <div>
              <div className="flex items-center gap-2">
                <Icon icon="mdi:link" width="24" height="24" className="text-[#f05d23]" />
                <p className={`text-sm font-medium ${isDark ? "text-white" : ""}`}>Currently Visiting:</p>
              </div>

              {visitedUrls.length === 0 ? (
                <p className={`text-sm mt-2 italic ${isDark ? "text-gray-300" : "text-gray-600"}`}>No URLs visited yet.</p>
              ) : (
                <>
                  <p className="text-sm text-[#f05d23] mt-2 truncate font-medium">
                    <a href={visitedUrls[visitedUrls.length - 1]} target="_blank" rel="noopener noreferrer" className="hover:underline" title={visitedUrls[visitedUrls.length - 1]}>
                      {truncateUrl(visitedUrls[visitedUrls.length - 1])}
                    </a>
                  </p>
                  {visitedUrls.length > 1 && (
                    <div className="mt-2">
                      <p className={`text-sm font-medium ${isDark ? "text-white" : ""}`}>Previously Visited:</p>
                      <ul className={`text-sm mt-1 space-y-1 ${isDark ? "text-white" : "text-gray-600"}`}>
                        {visitedUrls.slice(0, -1).reverse().map((url, index) => (
                          <li key={index} className="truncate hover:text-[#f05d23]">
                            <a href={url} target="_blank" rel="noopener noreferrer" title={url}>
                              {truncateUrl(url)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {scrapeStatus === "complete" && (
          <>
            <div className="flex items-center gap-2">
              <Icon icon="mdi:check-circle" width="24" height="24" className="text-[#f05d23]" />
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>Search Completed</h3>
              <span className="flex items-center gap-1">
                <p className={`text-sm ml-2 ${isDark ? "text-white" : "text-gray-600"}`}>{timeDifference || "Just now"}</p>
                <p className={`text-xs ml-1 ${isDark ? "text-white" : "text-gray-500"}`}>({formatScanDate(startTime)})</p>
              </span>
            </div>

            <div className={`grid gap-2 rounded-lg p-4 transition-all duration-300 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Tenders Found (Open)", value: tenders.length, icon: "mdi:file-document-outline" },
                  { label: "URLs Scanned", value: visitedUrls.length, icon: "mdi:link-variant" },
                  { label: "Search Engines", value: completedSearchEngines.length, icon: "mdi:magnify" },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-4 p-3 rounded-lg shadow-sm transform transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <Icon icon={item.icon} width="40" height="40" className="mb-2 text-[#f05d23]" />
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`grid gap-2 rounded-lg p-4 transition-all duration-300 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex items-center mb-2">
                <Icon icon="mdi:magnify" className="text-[#f05d23] mr-2" width="24" height="24" />
                <p className={`text-md font-medium ${isDark ? "text-white" : ""}`}>Search engines used:</p>
                <p className={`text-sm ml-2 ${isDark ? "text-white" : "text-gray-700"}`}>{completedSearchEngines.join(", ")}</p>
              </div>
            </div>

            <div className={`grid gap-2 rounded-lg p-4 transition-all duration-300 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <p className={`mt-3 text-sm italic ${isDark ? "text-white" : "text-gray-500"}`}>
                For detailed analysis and extracted information about the tenders,
                <span onClick={() => setShowSummary(true)} className="text-[#f05d23] hover:underline cursor-pointer font-medium ml-1">
                  view the complete summary report.
                </span>
              </p>
            </div>
          </>
        )}

        {scrapeStatus === "canceled" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:cancel" width="24" height="24" className="text-[#231812]" />
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>Scraping Canceled</h3>
            </div>
            <p className={isDark ? "text-gray-300" : "text-gray-600"}>
              The scan was canceled.{" "}
              <span onClick={() => setShowSummary(true)} className="text-[#f05d23] hover:underline cursor-pointer font-medium">
                View the summary
              </span>{" "}
              for details.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        {scrapeStatus === "running" && (
          <button
            onClick={handleCancelScrape}
            disabled={isCanceling}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 ${
              isCanceling ? "bg-[#4a3728] cursor-not-allowed" : "bg-[#231812] hover:bg-[#3a2a1e]"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#231812]`}
          >
            {isCanceling ? (
              <>
                <Icon icon="mdi:loading" width="24" height="24" className="animate-spin" />
                Canceling...
              </>
            ) : (
              <>
                <Icon icon="mdi:cancel" width="24" height="24" />
                Cancel Scraping
              </>
            )}
          </button>
        )}

        {(scrapeStatus === "complete" || scrapeStatus === "canceled") && (
          <div className="flex items-center gap-2 space-x-4 mt-4">
            <button
              onClick={() => router.push("/tenders")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium hover:bg-[#d04e1e] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f05d23]"
            >
              <Icon icon="mdi:table" width="24" height="24" />
              View All Tenders
            </button>
            <button
              onClick={() => setShowSummary(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#f05d23] text-white rounded-lg font-medium hover:bg-[#d04e1e] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f05d23]"
            >
              <Icon icon="mdi:clipboard-text" width="24" height="24" />
              View Summary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
