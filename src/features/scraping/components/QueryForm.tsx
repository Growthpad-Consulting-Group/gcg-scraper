"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import SearchTermsSelector from "./SearchTermsSelector";
import SearchEngineSelector from "./SearchEngineSelector";
import BaseKeywordsSelector from "./BaseKeywordsSelector";
import CountrySelector from "./CountrySelector";
import PreviewLink from "./PreviewLink";
import type { SearchTerm, BaseKeyword, Country, ScrapeStatus } from "@/features/scraping/types";

const ENGINE_URL_BUILDERS: Record<string, (q: string) => string> = {
  Bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  Yahoo: (q) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
  DuckDuckGo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  Ecosia: (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
  Startpage: (q) => `https://www.startpage.com/do/dsearch?query=${encodeURIComponent(q)}`,
};

export default function QueryForm({
  searchTerms,
  selectedTerms,
  setSelectedTerms,
  selectedEngines,
  setSelectedEngines,
  baseKeywords,
  selectedBaseKeywords,
  setSelectedBaseKeywords,
  countries,
  selectedCountry,
  setSelectedCountry,
  scrapeStatus,
  handleRunQuery,
  mode,
}: {
  searchTerms: SearchTerm[];
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
  selectedEngines: string[];
  setSelectedEngines: (engines: string[]) => void;
  baseKeywords: BaseKeyword[];
  selectedBaseKeywords: string[];
  setSelectedBaseKeywords: (keywords: string[]) => void;
  countries: Country[];
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  scrapeStatus: ScrapeStatus;
  handleRunQuery: () => void;
  handleAddScheduledTask?: () => void;
  mode: "light" | "dark";
}) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const currentYear = new Date().getFullYear();
  const query = `${currentYear} ${selectedBaseKeywords.join(" ")} ${selectedTerms.join(" ")} ${selectedCountry}`.trim();
  const previewUrls = selectedEngines.map((engine) => ({
    engine,
    url: ENGINE_URL_BUILDERS[engine] ? ENGINE_URL_BUILDERS[engine](query) : "#",
  }));

  const shouldShowPreview = selectedEngines.length > 0 && selectedBaseKeywords.length > 0 && selectedTerms.length > 0;

  return (
    <div
      className={`p-0 rounded-xl shadow-md hover:shadow-none animate-fade-in transition-shadow duration-500 border-t-4 border-[#f05d23] flex flex-col h-full ${
        mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"
      }`}
    >
      {shouldShowPreview && (
        <div className="p-4 flex justify-between items-center sticky top-0 z-10 bg-inherit">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-[#f05d23]">
            <Icon icon="mdi:magnify" width="24" height="24" className="text-[#f05d23]" />
            Query Form
          </h3>
          <button onClick={() => setIsPreviewVisible(!isPreviewVisible)} className="text-[#f05d23] hover:underline text-sm font-medium flex items-center gap-1">
            <Icon icon={isPreviewVisible ? "mdi:eye-off" : "mdi:eye"} width="16" height="16" />
            {isPreviewVisible ? "Hide Preview" : "Show Preview"}
          </button>
        </div>
      )}

      {shouldShowPreview && isPreviewVisible && (
        <div className="sticky top-12 z-10 bg-inherit">
          <PreviewLink mode={mode} previewUrls={previewUrls} />
        </div>
      )}

      <div className="p-6 flex-1 space-y-8 overflow-y-auto">
        <SearchTermsSelector searchTerms={searchTerms} selectedTerms={selectedTerms} setSelectedTerms={setSelectedTerms} mode={mode} />
        <SearchEngineSelector selectedEngines={selectedEngines} setSelectedEngines={setSelectedEngines} mode={mode} />
        <BaseKeywordsSelector baseKeywords={baseKeywords} selectedBaseKeywords={selectedBaseKeywords} setSelectedBaseKeywords={setSelectedBaseKeywords} mode={mode} />
        <CountrySelector countries={countries} selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} mode={mode} />
      </div>

      <div className="sticky bottom-0 dark:bg-gray-800 p-4 dark:border-gray-700">
        <button
          onClick={handleRunQuery}
          disabled={scrapeStatus === "running"}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
            scrapeStatus === "running" ? "bg-gray-500 cursor-not-allowed" : "bg-[#f05d23] hover:bg-[#d04e1e]"
          }`}
        >
          <Icon icon="mdi:search" width="24" height="24" />
          {scrapeStatus === "running" ? "Scraping..." : "Start Tender Search"}
        </button>
      </div>
    </div>
  );
}
