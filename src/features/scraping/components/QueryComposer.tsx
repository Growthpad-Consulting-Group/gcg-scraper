"use client";

import { Icon } from "@iconify/react";
import Popover from "@/shared/ui/Popover";
import Button from "@/shared/ui/Button";
import GlassPanel from "@/shared/ui/GlassPanel";
import SearchTermsSelector from "./SearchTermsSelector";
import BaseKeywordsSelector from "./BaseKeywordsSelector";
import CountrySelector from "./CountrySelector";
import type { SearchTerm, BaseKeyword, Country, ScrapeStatus } from "@/features/scraping/types";

function PickerTrigger({ icon, label, count, open }: { icon: string; label: string; count: number; open: boolean }) {
  return (
    <span
      className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors ${
        open ? "border-brand-500 text-brand-500" : "border-app-border text-text-hi hover:border-text-lo"
      }`}
    >
      <Icon icon={icon} width={15} />
      {label}
      <span className="font-mono text-[11px] text-text-lo">{count}</span>
      <Icon icon="solar:alt-arrow-down-broken" width={12} className="text-text-lo" />
    </span>
  );
}

/**
 * Single-bar query composer (Firecrawl Playground-style): a read-only query preview up top,
 * then a row of compact picker pills that open popovers instead of always-expanded sections.
 */
export default function QueryComposer({
  searchTerms,
  setSearchTerms,
  selectedTerms,
  setSelectedTerms,
  baseKeywords,
  setBaseKeywords,
  selectedBaseKeywords,
  setSelectedBaseKeywords,
  countries,
  selectedCountry,
  setSelectedCountry,
  resultsLimit,
  setResultsLimit,
  scrapeStatus,
  handleRunQuery,
  handleAddScheduledTask,
  mode,
}: {
  searchTerms: SearchTerm[];
  setSearchTerms?: (updater: (prev: SearchTerm[]) => SearchTerm[]) => void;
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
  baseKeywords: BaseKeyword[];
  setBaseKeywords?: (updater: (prev: BaseKeyword[]) => BaseKeyword[]) => void;
  selectedBaseKeywords: string[];
  setSelectedBaseKeywords: (keywords: string[]) => void;
  countries: Country[];
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  resultsLimit: number;
  setResultsLimit: (n: number) => void;
  scrapeStatus: ScrapeStatus;
  handleRunQuery: () => void;
  handleAddScheduledTask?: () => void;
  mode: "light" | "dark";
}) {
  const currentYear = new Date().getFullYear();
  const query = `${currentYear} ${selectedBaseKeywords.join(" ")} ${selectedTerms.join(" ")} ${selectedCountry}`.trim();
  const isRunning = scrapeStatus === "running";
  const canRun = selectedTerms.length > 0 && selectedBaseKeywords.length > 0;

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-3 rounded-lg p-3">
      <div className="rounded-md border border-app-border bg-canvas px-3 py-3 font-mono text-sm text-text-hi">
        {query || <span className="text-text-lo">Pick keywords, terms, and a country to build your query…</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover trigger={(open) => <PickerTrigger icon="solar:magnifer-broken" label="Terms" count={selectedTerms.length} open={open} />} className="w-80">
          <SearchTermsSelector searchTerms={searchTerms} setSearchTerms={setSearchTerms} selectedTerms={selectedTerms} setSelectedTerms={setSelectedTerms} mode={mode} />
        </Popover>

        <Popover trigger={(open) => <PickerTrigger icon="solar:tag-broken" label="Keywords" count={selectedBaseKeywords.length} open={open} />} className="w-80">
          <BaseKeywordsSelector baseKeywords={baseKeywords} setBaseKeywords={setBaseKeywords} selectedBaseKeywords={selectedBaseKeywords} setSelectedBaseKeywords={setSelectedBaseKeywords} mode={mode} />
        </Popover>

        <Popover
          trigger={(open) => <PickerTrigger icon="solar:map-point-broken" label="Country" count={selectedCountry ? 1 : 0} open={open} />}
          className="w-72"
        >
          <CountrySelector countries={countries} selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} mode={mode} />
        </Popover>

        <label className="flex h-8 items-center gap-1.5 rounded-md border border-app-border px-2.5 text-sm text-text-hi">
          <Icon icon="solar:list-broken" width={15} className="text-text-lo" />
          Results
          <input
            type="number"
            min={1}
            max={50}
            value={resultsLimit}
            onChange={(e) => setResultsLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="w-12 bg-transparent text-sm text-text-hi outline-none"
          />
        </label>

        <div className="ml-auto flex items-center gap-2">
          {handleAddScheduledTask && (
            <Button size="md" variant="secondary" onClick={handleAddScheduledTask} disabled={!canRun}>
              <Icon icon="solar:calendar-add-broken" width={15} />
              Schedule
            </Button>
          )}
          <Button size="sm" onClick={handleRunQuery} disabled={isRunning || !canRun}>
            <Icon icon={isRunning ? "mdi:loading" : "solar:play-circle-broken"} width={15} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? "Running…" : "Run Query"}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
