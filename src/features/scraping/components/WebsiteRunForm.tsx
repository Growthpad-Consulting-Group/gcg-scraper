"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";
import Popover from "@/shared/ui/Popover";
import GlassPanel from "@/shared/ui/GlassPanel";
import useTypewriterPlaceholder from "@/shared/hooks/useTypewriterPlaceholder";
import type { ExtractOptions } from "@/features/tenders/api/firecrawlExtract";

export interface WebsiteSource {
  id: number;
  name: string | null;
  url: string;
  location: string | null;
}

const inputClass = "h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";
const optionInputClass = "h-8 w-28 rounded-md border border-app-border bg-canvas px-2 text-sm text-text-hi outline-none focus:border-brand-500";

const URL_EXAMPLES = [
  "https://example.gov/tenders",
  "https://techcrunch.com/procurement",
  "https://supplier-portal.co.ke/rfps",
  "https://company.com/opportunities",
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-surface-2"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function WebsiteRunForm({
  url,
  setUrl,
  name,
  setName,
  location,
  setLocation,
  isRunning,
  onRun,
  mode,
  sources = [],
  onSelectSource,
}: {
  url: string;
  setUrl: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  isRunning: boolean;
  onRun: (options: ExtractOptions) => void;
  mode?: "light" | "dark";
  /** Already-tracked sites, so re-running one doesn't mean retyping its URL. */
  sources?: WebsiteSource[];
  onSelectSource?: (source: WebsiteSource) => void;
}) {
  const canRun = url.trim().length > 0;
  const urlPlaceholder = useTypewriterPlaceholder(URL_EXAMPLES, url.length === 0);

  const [onlyMainContent, setOnlyMainContent] = useState(true);
  const [waitFor, setWaitFor] = useState("");
  const [timeout, setTimeoutMs] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [excludeTags, setExcludeTags] = useState("");
  const [includeTags, setIncludeTags] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const toArray = (v: string) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const handleRun = () => {
    onRun({
      onlyMainContent,
      waitFor: waitFor ? Number(waitFor) : undefined,
      timeout: timeout ? Number(timeout) : undefined,
      maxAge: maxAge ? Number(maxAge) : undefined,
      excludeTags: toArray(excludeTags),
      includeTags: toArray(includeTags),
    });
  };

  const filteredSources = sources.filter((s) => {
    const q = sourceFilter.trim().toLowerCase();
    if (!q) return true;
    return (s.name || "").toLowerCase().includes(q) || s.url.toLowerCase().includes(q);
  });

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-3 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-lo">Scrape a new URL, or pick one you're already tracking.</span>
        <Link href="/upload-website" className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
          View tracked sources
          <Icon icon="solar:arrow-right-broken" width={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex gap-2 sm:col-span-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={urlPlaceholder} className={`${inputClass} flex-1`} />
          {sources.length > 0 && (
            <Popover
              trigger={(open) => (
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                    open ? "border-brand-500 text-brand-500" : "border-app-border text-text-lo hover:border-text-lo"
                  }`}
                  title="Pick an existing source"
                >
                  <Icon icon="solar:list-broken" width={16} />
                </span>
              )}
              className="w-72"
            >
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  placeholder="Search tracked sources…"
                  className={`${inputClass} w-full`}
                />
                <div className="max-h-64 overflow-y-auto">
                  {filteredSources.length === 0 ? (
                    <p className="py-2 text-xs text-text-lo">No matching sources.</p>
                  ) : (
                    filteredSources.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onSelectSource?.(s);
                          setSourceFilter("");
                        }}
                        className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-2"
                      >
                        <span className="truncate text-sm text-text-hi">{s.name || s.url}</span>
                        <span className="truncate font-mono text-[11px] text-text-lo">{s.url}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </Popover>
          )}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={inputClass} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className={`${inputClass} w-56`}
          />
          <Popover
            trigger={(open) => (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                  open ? "border-brand-500 text-brand-500" : "border-app-border text-text-lo hover:border-text-lo"
                }`}
              >
                <Icon icon="solar:tuning-2-broken" width={16} />
              </span>
            )}
            className="w-80"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-hi">Options</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-hi">Main content only</span>
                <Toggle checked={onlyMainContent} onChange={setOnlyMainContent} />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-text-hi">Wait</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} value={waitFor} onChange={(e) => setWaitFor(e.target.value)} placeholder="0" className={optionInputClass} />
                  <span className="text-xs text-text-lo">ms</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-text-hi">Timeout</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} value={timeout} onChange={(e) => setTimeoutMs(e.target.value)} placeholder="30000" className={optionInputClass} />
                  <span className="text-xs text-text-lo">ms</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-text-hi">Max age</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="0" className={optionInputClass} />
                  <span className="text-xs text-text-lo">ms</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-text-hi">Exclude tags</label>
                <input
                  value={excludeTags}
                  onChange={(e) => setExcludeTags(e.target.value)}
                  placeholder="nav, .cookie-banner"
                  className={`${inputClass} w-full`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-text-hi">Include tags</label>
                <input
                  value={includeTags}
                  onChange={(e) => setIncludeTags(e.target.value)}
                  placeholder="main, article"
                  className={`${inputClass} w-full`}
                />
              </div>
            </div>
          </Popover>
        </div>
        <Button size="sm" onClick={handleRun} disabled={isRunning || !canRun}>
          <Icon icon={isRunning ? "mdi:loading" : "solar:play-circle-broken"} width={15} className={isRunning ? "animate-spin" : ""} />
          {isRunning ? "Running…" : "Run"}
        </Button>
      </div>
    </GlassPanel>
  );
}
