"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import PageHeader from "@/shared/ui/PageHeader";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { useTheme } from "@/shared/contexts/ThemeContext";
import QueryComposer from "@/features/scraping/components/QueryComposer";
import WebsiteRunForm, { type WebsiteSource } from "@/features/scraping/components/WebsiteRunForm";
import LeadRunForm from "@/features/scraping/components/LeadRunForm";
import DocumentRunForm, { type DocumentParseOptions } from "@/features/scraping/components/DocumentRunForm";
import RunModeSwitcher, { isRunMode, type RunMode } from "@/features/scraping/components/RunModeSwitcher";
import RunConsole from "@/features/scraping/components/RunConsole";
import SummaryModal from "@/features/scraping/components/SummaryModal";
import AddSchedulerModal from "@/features/scheduler/components/AddSchedulerModal";
import useRealtimeJob from "@/features/scraping/hooks/useRealtimeJob";
import type { SearchTerm, BaseKeyword, Country } from "@/features/scraping/types";
import type { ExtractOptions } from "@/features/tenders/api/firecrawlExtract";

function resultsHrefFor(mode: RunMode, jobId: string | null): string | undefined {
  if (!jobId) return undefined;
  if (mode === "gmb-leads") return `/leads?job=${jobId}&tab=gmb`;
  if (mode === "linkedin-leads") return `/leads?job=${jobId}&tab=linkedin`;
  return `/tenders?job=${jobId}`;
}

function RunQueryContent() {
  const { resolvedMode: mode } = useTheme();
  const { loading: userLoading } = useUserProfile();
  const searchParams = useSearchParams();

  const urlMode = searchParams?.get("mode") ?? null;
  const [runMode, setRunMode] = useState<RunMode>(isRunMode(urlMode) ? urlMode : "search-query");

  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [baseKeywords, setBaseKeywords] = useState<BaseKeyword[]>([]);
  const [selectedBaseKeywords, setSelectedBaseKeywords] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [resultsLimit, setResultsLimit] = useState(10);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [websiteLocation, setWebsiteLocation] = useState("");
  const [websiteKeywords, setWebsiteKeywords] = useState<string[]>([]);
  const [websiteCountries, setWebsiteCountries] = useState<string[]>([]);
  const [isAddingWebsite, setIsAddingWebsite] = useState(false);
  const [websiteSources, setWebsiteSources] = useState<WebsiteSource[]>([]);

  const [gmbSearchTerm, setGmbSearchTerm] = useState("");
  const [gmbLocation, setGmbLocation] = useState("");
  const [gmbMaxResults, setGmbMaxResults] = useState(30);
  const [linkedinSearchQuery, setLinkedinSearchQuery] = useState("");
  const [linkedinLocation, setLinkedinLocation] = useState("");
  const [linkedinMaxResults, setLinkedinMaxResults] = useState(25);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobKind, setJobKind] = useState<RunMode>("search-query");
  const [isCanceling, setIsCanceling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenderTypes, setTenderTypes] = useState<string[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const {
    scrapeStatus,
    setScrapeStatus,
    progress,
    visitedUrls,
    totalUrlsToVisit,
    jobKind: liveJobKind,
    stage: liveStage,
    summary,
    showSummary,
    setShowSummary,
    reset,
  } = useRealtimeJob(jobId);

  useEffect(() => {
    const urlTaskId = searchParams?.get("taskId");
    if (urlTaskId) setJobId(urlTaskId);
  }, [searchParams]);

  useEffect(() => {
    if (isRunMode(urlMode) && urlMode !== runMode) setRunMode(urlMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlMode]);

  const changeMode = (next: RunMode) => {
    setRunMode(next);
    // Update the URL directly (not via router.replace) so the mode switch doesn't
    // re-suspend the useSearchParams() boundary and reset in-flight UI state like
    // hover tooltips — we already hold `next` in local state above.
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    params.set("mode", next);
    params.delete("taskId");
    window.history.replaceState(null, "", `/run-query?${params.toString()}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [searchTermsRes, baseKeywordsRes, countriesRes, tenderTypesRes, websitesRes] = await Promise.all([
          fetch("/api/search-terms"),
          fetch("/api/base-keywords"),
          fetch("/api/countries"),
          fetch("/api/tender-types"),
          fetch("/api/websites?limit=50"),
        ]);
        const searchTermsData = await searchTermsRes.json();
        const baseKeywordsData = await baseKeywordsRes.json();
        const countriesData: Country[] = await countriesRes.json();
        const tenderTypesData = await tenderTypesRes.json();
        const websitesData = await websitesRes.json();
        setTenderTypes(Array.isArray(tenderTypesData.tenderTypes) ? tenderTypesData.tenderTypes : []);
        setWebsiteSources(Array.isArray(websitesData.websites) ? websitesData.websites : []);

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

  const handleAddScheduledTask = () => {
    if (selectedTerms.length === 0 || selectedBaseKeywords.length === 0) {
      toast.error("Please select at least one search term and base keyword.");
      return;
    }
    setIsScheduleModalOpen(true);
  };

  const startJob = (id: string, kind: RunMode) => {
    reset();
    setJobKind(kind);
    setScrapeStatus("running");
    setJobId(id);
  };

  const handleRunQuery = async () => {
    if (selectedTerms.length === 0 || selectedBaseKeywords.length === 0) {
      toast.error("Please select at least one search term and base keyword.");
      return;
    }

    toast.loading("Scraping started...", { id: "scrape-start" });
    const currentYear = new Date().getFullYear();
    const query = `${currentYear} ${selectedBaseKeywords.join(" ")} ${selectedTerms.join(" ")} ${selectedCountry}`.trim();

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, resultsLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start scraping");

      startJob(data.jobId, "search-query");
      toast.dismiss("scrape-start");
    } catch (err: any) {
      setScrapeStatus("error");
      toast.error("Failed to start scraping: " + err.message, { id: "scrape-start" });
    }
  };

  const handleRunWebsite = async (extractOptions: ExtractOptions) => {
    if (!websiteUrl.trim()) return;
    setIsAddingWebsite(true);
    toast.loading("Adding source and starting scan...", { id: "website-start" });

    try {
      const createRes = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl.trim(), name: websiteName.trim() || undefined, location: websiteLocation.trim() || undefined }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to add website");

      const scanRes = await fetch(`/api/websites/${createData.website.id}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractOptions, keywords: websiteKeywords, countries: websiteCountries }),
      });
      const scanData = await scanRes.json();
      if (!scanRes.ok) throw new Error(scanData.error || "Failed to start scan");

      startJob(scanData.jobId, "website");
      setWebsiteUrl("");
      setWebsiteName("");
      setWebsiteLocation("");
      toast.dismiss("website-start");
    } catch (err: any) {
      toast.error("Failed to run website scrape: " + err.message, { id: "website-start" });
    } finally {
      setIsAddingWebsite(false);
    }
  };

  const handleRunDocument = async (file: File, parseOptions: DocumentParseOptions) => {
    toast.loading("Uploading document...", { id: "document-start" });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("parseOptions", JSON.stringify(parseOptions));
      const res = await fetch("/api/jobs/document", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start document parse");
      startJob(data.jobId, "document");
      toast.dismiss("document-start");
    } catch (err: any) {
      setScrapeStatus("error");
      toast.error("Failed to parse document: " + err.message, { id: "document-start" });
    }
  };

  const handleRunGmbLeads = async () => {
    if (!gmbSearchTerm.trim()) return;
    toast.loading("Starting lead search...", { id: "gmb-start" });
    try {
      const res = await fetch("/api/leads/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm: gmbSearchTerm.trim(), location: gmbLocation.trim(), maxResults: gmbMaxResults }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start search");

      startJob(data.jobId, "gmb-leads");
      toast.success("Searching Google Maps... this can take a minute.", { id: "gmb-start", duration: 4000 });
    } catch (err: any) {
      toast.error("Failed to start search: " + err.message, { id: "gmb-start" });
    }
  };

  const handleRunLinkedinLeads = async () => {
    if (!linkedinSearchQuery.trim()) return;
    toast.loading("Starting LinkedIn search...", { id: "linkedin-start" });
    try {
      const res = await fetch("/api/linkedin-leads/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchQuery: linkedinSearchQuery.trim(), location: linkedinLocation.trim(), maxResults: linkedinMaxResults }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start search");

      startJob(data.jobId, "linkedin-leads");
      toast.success("Searching LinkedIn... this can take a minute.", { id: "linkedin-start", duration: 4000 });
    } catch (err: any) {
      toast.error("Failed to start search: " + err.message, { id: "linkedin-start" });
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

  const summaryKind = jobKind === "gmb-leads" || jobKind === "linkedin-leads" ? "leads" : "tenders";

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Run Query"
          description="Search, scrape, and find leads from one place — pick a mode below to get started."
          icon="solar:database-broken"
        />

        {error && <div className="rounded-md bg-status-danger/10 p-4 text-sm text-status-danger">{error}</div>}

        {loading || userLoading ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-app-border bg-surface">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="mdi:loading" width={32} height={32} className="animate-spin text-brand-500" />
              <p className="text-sm text-text-lo">Loading, please wait…</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              <div className="flex justify-center">
                <RunModeSwitcher mode={runMode} onChange={changeMode} />
              </div>

            <div className={runMode === "search-query" ? undefined : "hidden"}>
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
                resultsLimit={resultsLimit}
                setResultsLimit={setResultsLimit}
                scrapeStatus={scrapeStatus}
                handleRunQuery={handleRunQuery}
                handleAddScheduledTask={handleAddScheduledTask}
                mode={mode}
              />
            </div>

            <div className={runMode === "website" ? undefined : "hidden"}>
              <WebsiteRunForm
                url={websiteUrl}
                setUrl={setWebsiteUrl}
                name={websiteName}
                setName={setWebsiteName}
                location={websiteLocation}
                setLocation={setWebsiteLocation}
                isRunning={isAddingWebsite || scrapeStatus === "running"}
                onRun={handleRunWebsite}
                mode={mode}
                sources={websiteSources}
                onSelectSource={(s) => {
                  setWebsiteUrl(s.url);
                  setWebsiteName(s.name || "");
                  setWebsiteLocation(s.location || "");
                }}
                countries={countries.map((c) => c.country_name)}
                selectedCountries={websiteCountries}
                onSelectedCountriesChange={setWebsiteCountries}
                keywordOptions={searchTerms.map((t) => t.term)}
                selectedKeywords={websiteKeywords}
                onSelectedKeywordsChange={setWebsiteKeywords}
              />
            </div>

            <div className={runMode === "document" ? undefined : "hidden"}>
              <DocumentRunForm
                isRunning={scrapeStatus === "running"}
                onRun={handleRunDocument}
                mode={mode}
              />
            </div>

            <div className={runMode === "gmb-leads" ? undefined : "hidden"}>
              <LeadRunForm
                kind="gmb"
                searchTerm={gmbSearchTerm}
                setSearchTerm={setGmbSearchTerm}
                location={gmbLocation}
                setLocation={setGmbLocation}
                maxResults={gmbMaxResults}
                setMaxResults={setGmbMaxResults}
                isRunning={scrapeStatus === "running"}
                onRun={handleRunGmbLeads}
                mode={mode}
                countries={countries.map((c) => c.country_name)}
              />
            </div>

            <div className={runMode === "linkedin-leads" ? undefined : "hidden"}>
              <LeadRunForm
                kind="linkedin"
                searchTerm={linkedinSearchQuery}
                setSearchTerm={setLinkedinSearchQuery}
                location={linkedinLocation}
                setLocation={setLinkedinLocation}
                maxResults={linkedinMaxResults}
                setMaxResults={setLinkedinMaxResults}
                isRunning={scrapeStatus === "running"}
                onRun={handleRunLinkedinLeads}
                mode={mode}
                countries={countries.map((c) => c.country_name)}
              />
            </div>
            </div>

            <div className="mx-auto w-full max-w-4xl min-h-[500px]">
              <RunConsole
                scrapeStatus={scrapeStatus}
                progress={progress}
                visitedUrls={visitedUrls}
                totalUrlsToVisit={totalUrlsToVisit}
                jobKind={liveJobKind}
                stage={liveStage}
                isCanceling={isCanceling}
                handleCancelScrape={handleCancelScrape}
                taskId={jobId}
                mode={mode}
              />
            </div>
          </div>
        )}
      </div>

      <SummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        summary={summary}
        scrapeStatus={scrapeStatus}
        startTime={summary.startTime}
        kind={summaryKind}
        resultsHref={resultsHrefFor(jobKind, jobId)}
      />

      <AddSchedulerModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        mode={mode}
        tenderTypes={tenderTypes}
        initialSearchTerms={selectedTerms}
        initialTenderType="Search Query Tenders"
        onTaskAdded={() => {}}
      />
    </>
  );
}

export default function RunQueryPage() {
  return (
    <Suspense fallback={null}>
      <RunQueryContent />
    </Suspense>
  );
}
