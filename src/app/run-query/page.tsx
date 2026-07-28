"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Sidebar from "@/shared/components/Sidebar";
import Header from "@/shared/components/Header";
import SimpleFooter from "@/shared/components/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/app/providers";
import QueryForm from "@/features/scraping/components/QueryForm";
import ScrapingStatus from "@/features/scraping/components/ScrapingStatus";
import SummaryModal from "@/features/scraping/components/SummaryModal";
import useRealtimeJob from "@/features/scraping/hooks/useRealtimeJob";
import type { SearchTerm, BaseKeyword, Country } from "@/features/scraping/types";

function RunQueryContent() {
  const { mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { fullName, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();
  const searchParams = useSearchParams();

  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["Bing"]);
  const [baseKeywords, setBaseKeywords] = useState<BaseKeyword[]>([]);
  const [selectedBaseKeywords, setSelectedBaseKeywords] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { scrapeStatus, setScrapeStatus, progress, visitedUrls, totalUrlsToVisit, summary, showSummary, setShowSummary, reset } =
    useRealtimeJob(jobId);

  useEffect(() => {
    const urlTaskId = searchParams?.get("taskId");
    if (urlTaskId) setJobId(urlTaskId);
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [searchTermsRes, baseKeywordsRes, countriesRes] = await Promise.all([
          fetch("/api/search-terms"),
          fetch("/api/base-keywords"),
          fetch("/api/countries"),
        ]);
        const searchTermsData = await searchTermsRes.json();
        const baseKeywordsData = await baseKeywordsRes.json();
        const countriesData: Country[] = await countriesRes.json();

        setSearchTerms(searchTermsData.search_terms || []);
        if (searchTermsData.search_terms?.length > 0) setSelectedTerms([searchTermsData.search_terms[0].term]);

        setBaseKeywords(baseKeywordsData || []);
        if (baseKeywordsData?.length > 0) setSelectedBaseKeywords(baseKeywordsData.map((kw: BaseKeyword) => kw.keyword));

        const validCountries = Array.isArray(countriesData) ? countriesData.filter((c) => c?.id != null && c?.country_name != null) : [];
        setCountries(validCountries);
        const kenya = validCountries.find((c) => c.country_name === "Kenya");
        setSelectedCountry(kenya ? kenya.country_name : validCountries[0]?.country_name || "Kenya");
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load page data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddScheduledTask = async () => {
    if (selectedTerms.length === 0 || selectedEngines.length === 0 || selectedBaseKeywords.length === 0) {
      toast.error("Please select at least one search term, base keyword, and engine.");
      return;
    }

    try {
      const res = await fetch("/api/scheduled-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Scheduled Task",
          frequency: "Daily",
          tenderType: "Search Query Tenders",
          search_terms: selectedTerms,
          engines: selectedEngines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule task");

      toast.success("Task scheduled successfully! It will run at the next scheduled time.");
    } catch (err: any) {
      toast.error("Failed to schedule task: " + err.message);
    }
  };

  const handleRunQuery = async () => {
    if (selectedTerms.length === 0 || selectedEngines.length === 0 || selectedBaseKeywords.length === 0) {
      toast.error("Please select at least one search term, base keyword, and engine.");
      return;
    }

    reset();
    setScrapeStatus("running");
    toast.loading("Scraping started...", { id: "scrape-start" });

    const currentYear = new Date().getFullYear();
    const query = `${currentYear} ${selectedBaseKeywords.join(" ")} ${selectedTerms.join(" ")} ${selectedCountry}`.trim();

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, engines: selectedEngines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start scraping");

      setJobId(data.jobId);
      toast.dismiss("scrape-start");
    } catch (err: any) {
      setScrapeStatus("error");
      setJobId(null);
      toast.error("Failed to start scraping: " + err.message, { id: "scrape-start" });
    }
  };

  const handleCancelScrape = async () => {
    if (!jobId) {
      toast.error("No active scraping task to cancel");
      return;
    }
    setIsCanceling(true);
    try {
      // Job cancellation isn't wired into the Inngest runner yet (Phase 2) — this marks it
      // canceled client-side for now.
      setScrapeStatus("canceled");
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col pt-14 ${mode === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800" : "bg-gradient-to-b from-gray-50 to-gray-100"}`}>
      <Header
        toggleSidebar={toggleSidebar}
        isSidebarOpen={!!isSidebarOpen}
        mode={mode}
        toggleMode={toggleMode}
        onLogout={handleLogout}
        pageName="Tender Overview"
        pageDescription="Monitor and manage your tender scraping tasks."
        fullName={fullName}
        loading={userLoading}
        notifications={notifications}
        isLoading={notificationsLoading}
        onMarkAsRead={markNotificationAsRead}
      />
      <div className="flex flex-1">
        <Sidebar isOpen={!!isSidebarOpen} mode={mode} onLogout={handleLogout} toggleSidebar={toggleSidebar} fullName={fullName} />
        <div className="content-container flex-1 p-6 transition-all duration-300 overflow-hidden md:ml-[80px] sidebar-open:md:ml-[300px] sidebar-closed:md:ml-[80px]">
          <div className="max-w-7xl mx-auto">
            {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}
            {loading || userLoading ? (
              <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
                <div className="flex flex-col items-center">
                  <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
                  <p className={`mt-2 text-lg font-medium animate-pulse ${mode === "dark" ? "text-gray-300" : "text-[#231812]"}`}>Loading, please wait...</p>
                </div>
              </div>
            ) : (
              <>
                {scrapeStatus === "error" && (
                  <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${mode === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-700"}`}>
                    <Icon icon="mdi:alert-circle" width="24" height="24" />
                    <p>An error occurred. Please try again.</p>
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 max-h-[600px] overflow-y-auto">
                    <QueryForm
                      searchTerms={searchTerms}
                      selectedTerms={selectedTerms}
                      setSelectedTerms={setSelectedTerms}
                      selectedEngines={selectedEngines}
                      setSelectedEngines={setSelectedEngines}
                      baseKeywords={baseKeywords}
                      selectedBaseKeywords={selectedBaseKeywords}
                      setSelectedBaseKeywords={setSelectedBaseKeywords}
                      countries={countries}
                      selectedCountry={selectedCountry}
                      setSelectedCountry={setSelectedCountry}
                      scrapeStatus={scrapeStatus}
                      handleRunQuery={handleRunQuery}
                      handleAddScheduledTask={handleAddScheduledTask}
                      mode={mode}
                    />
                  </div>
                  <div className="flex-1">
                    <ScrapingStatus
                      scrapeStatus={scrapeStatus}
                      progress={progress}
                      visitedUrls={visitedUrls}
                      tenders={[]}
                      isCanceling={isCanceling}
                      handleCancelScrape={handleCancelScrape}
                      setShowSummary={setShowSummary}
                      mode={mode}
                      completedSearchEngines={selectedEngines}
                      startTime={summary.startTime}
                      totalUrlsToVisit={totalUrlsToVisit}
                      taskId={jobId}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <SummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} summary={summary} mode={mode} scrapeStatus={scrapeStatus} startTime={summary.startTime} taskId={jobId} />
      <SimpleFooter mode={mode} isSidebarOpen={!!isSidebarOpen} />
    </div>
  );
}

export default function RunQueryPage() {
  return (
    <Suspense fallback={null}>
      <RunQueryContent />
    </Suspense>
  );
}
