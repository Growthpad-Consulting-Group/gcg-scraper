"use client";

import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import Popover from "@/shared/ui/Popover";
import Button from "@/shared/ui/Button";
import GlassPanel from "@/shared/ui/GlassPanel";
import SearchTermsSelector from "./SearchTermsSelector";
import BaseKeywordsSelector from "./BaseKeywordsSelector";
import CountrySelector from "./CountrySelector";
import toast from "react-hot-toast";
import type { SearchTerm, BaseKeyword, Country, ScrapeStatus } from "@/features/scraping/types";

interface BlockedDomain { id: number; domain: string; reason: string | null; }

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

function BlockedDomainsPanel() {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetch("/api/blocked-domains")
      .then((r) => r.json())
      .then((d) => setDomains(d.blockedDomains ?? []))
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    const trimmed = newDomain.trim();
    if (!trimmed) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/blocked-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDomains((prev) => [...prev, data.blockedDomain].sort((a, b) => a.domain.localeCompare(b.domain)));
      setNewDomain("");
      toast.success(`${data.blockedDomain.domain} blocked`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: number, domain: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== id));
    try {
      await fetch(`/api/blocked-domains/${id}`, { method: "DELETE" });
      toast.success(`${domain} unblocked`);
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-hi">Query Settings</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-lo uppercase tracking-wide">Blocked Domains</span>
        <p className="text-xs text-text-lo">Domains skipped during extraction — paywalled or login-required sites.</p>
      </div>

      {/* Add input */}
      <div className="flex gap-1.5">
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="example.com"
          className="h-8 flex-1 rounded-md border border-app-border bg-canvas px-2.5 font-mono text-xs text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
        />
        <button
          onClick={handleAdd}
          disabled={isAdding || !newDomain.trim()}
          className="flex h-8 items-center gap-1 rounded-md border border-app-border px-2.5 text-xs text-text-lo transition-colors hover:border-brand-500 hover:text-brand-500 disabled:opacity-40"
        >
          <Icon icon={isAdding ? "mdi:loading" : "solar:add-circle-broken"} width={13} className={isAdding ? "animate-spin" : ""} />
          Block
        </button>
      </div>

      {/* Domain list */}
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {domains.length === 0 ? (
          <p className="text-xs text-text-lo">No domains blocked.</p>
        ) : (
          domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
              <span className="truncate font-mono text-xs text-text-hi">{d.domain}</span>
              <button
                onClick={() => handleRemove(d.id, d.domain)}
                className="shrink-0 text-text-lo hover:text-status-danger transition-colors"
                aria-label={`Unblock ${d.domain}`}
              >
                <Icon icon="solar:close-circle-broken" width={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
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
        </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Popover
            trigger={(open) => (
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                  open ? "border-brand-500 text-brand-500" : "border-app-border text-text-lo hover:border-text-lo"
                }`}
              >
                <Icon icon="solar:tuning-2-broken" width={15} />
              </span>
            )}
            className="w-80"
          >
            <BlockedDomainsPanel />
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          {handleAddScheduledTask && (
            <Button
              size="md"
              variant="secondary"
              onClick={handleAddScheduledTask}
              disabled={!canRun}
              title="Turn this into a recurring task in Automation, instead of running it just once here"
            >
              <Icon icon="solar:calendar-add-broken" width={15} />
              Schedule
            </Button>
          )}
          <Button size="sm" onClick={handleRunQuery} disabled={isRunning || !canRun} title="Run this search once, right now">
            <Icon icon={isRunning ? "mdi:loading" : "solar:play-circle-broken"} width={15} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? "Running…" : "Run Query"}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
