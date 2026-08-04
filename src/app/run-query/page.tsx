"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { useTheme } from "@/shared/contexts/ThemeContext";
import QueryComposer from "@/features/scraping/components/QueryComposer";
import RunConsole from "@/features/scraping/components/RunConsole";
import SummaryModal from "@/features/scraping/components/SummaryModal";
import useRealtimeJob from "@/features/scraping/hooks/useRealtimeJob";
import type { SearchTerm, BaseKeyword, Country } from "@/features/scraping/types";

function RunQueryContent() {
  const { resolvedMode: mode } = useTheme();
  const { loading: userLoading } = useUserProfile();
  const searchParams = useSearchParams();

  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
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
    if (selectedTerms.length === 0 || selectedBaseKeywords.length === 0) {
      toast.error("Please select at least one search term and base keyword.");
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
    if (selectedTerms.length === 0 || selectedBaseKeywords.length === 0) {
      toast.error("Please select at least one search term and base keyword.");
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
        body: JSON.stringify({ query }),
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
      const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      // The running job checks its own status between steps and stops itself — the realtime
      // subscription in useRealtimeJob picks up the resulting "canceled" row update.
      toast.success("Canceling — the job will stop after its current step.");
    } catch (err: any) {
      toast.error("Failed to cancel: " + err.message);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-hi">Run Query</h1>
          <p className="mt-0.5 text-sm text-text-lo">Search and scrape tenders from configured sources.</p>
        </div>

        {error && <div className="rounded-md bg-status-danger/10 p-4 text-sm text-status-danger">{error}</div>}

        {loading || userLoading ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-app-border bg-surface">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="mdi:loading" width={32} height={32} className="animate-spin text-brand-500" />
              <p className="text-sm text-text-lo">Loading, please wait…</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <QueryComposer
              searchTerms={searchTerms}
              setSearchTerms={setSearchTerms}
              selectedTerms={selectedTerms}
              setSelectedTerms={setSelectedTerms}
              baseKeywords={baseKeywords}
              setBaseKeywords={setBaseKeywords}
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
            <div className="min-h-[500px]">
              <RunConsole
                scrapeStatus={scrapeStatus}
                progress={progress}
                visitedUrls={visitedUrls}
                totalUrlsToVisit={totalUrlsToVisit}
                isCanceling={isCanceling}
                handleCancelScrape={handleCancelScrape}
                taskId={jobId}
              />
            </div>
          </div>
        )}
      </div>

      <SummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} summary={summary} mode={mode} scrapeStatus={scrapeStatus} startTime={summary.startTime} taskId={jobId} />
    </AppShell>
  );
}

export default function RunQueryPage() {
  return (
    <Suspense fallback={null}>
      <RunQueryContent />
    </Suspense>
  );
}
