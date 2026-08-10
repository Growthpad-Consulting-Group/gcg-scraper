"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Select from "react-select";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";
import Popover from "@/shared/ui/Popover";
import GlassPanel from "@/shared/ui/GlassPanel";
import useTypewriterPlaceholder from "@/shared/hooks/useTypewriterPlaceholder";
import LocationInput from "./LocationInput";
import { getSelectStyles } from "@/utils/selectStyles";
import type { ExtractOptions } from "@/features/tenders/api/firecrawlExtract";

export interface WebsiteSource {
  id: number;
  name: string | null;
  url: string;
  location: string | null;
}

type SourceOption = { value: number; label: string; url: string };

const inputClass = "h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";
const optionInputClass = "h-8 w-28 rounded-md border border-app-border bg-canvas px-2 text-sm text-text-hi outline-none focus:border-brand-500";

/** Fallback examples for when nothing's been tracked yet — real tracked URLs are used instead once they exist. */
const GENERIC_URL_EXAMPLES = [
  "https://example.gov/tenders",
  "https://supplier-portal.co.ke/rfps",
  "https://company.com/opportunities",
  "https://procurement.example.org/notices",
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
  countries = [],
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
  /** Powers the location field's autocomplete suggestions — stays free text, just easier to fill in. */
  countries?: string[];
}) {
  const canRun = url.trim().length > 0;
  const urlExamples = useMemo(() => {
    if (sources.length === 0) return GENERIC_URL_EXAMPLES;
    const shuffled = [...sources];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 6).map((s) => s.url);
  }, [sources]);
  const urlPlaceholder = useTypewriterPlaceholder(urlExamples, url.length === 0);

  const [onlyMainContent, setOnlyMainContent] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [waitFor, setWaitFor] = useState("");
  const [timeout, setTimeoutMs] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [excludeTags, setExcludeTags] = useState("");
  const [includeTags, setIncludeTags] = useState("");

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

  const sourceOptions: SourceOption[] = sources
    .map((s) => ({ value: s.id, label: s.name || s.url, url: s.url }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // The shared select styling is tuned for GenericTable's larger filter bar (52px control,
  // heavy rounding) — override just size/radius here so it sits naturally among this form's h-9 inputs.
  const baseStyles = getSelectStyles<SourceOption>(mode);
  const compactSelectStyles = {
    ...baseStyles,
    control: (base: any, state: any) => ({ ...(baseStyles.control as any)(base, state), minHeight: "36px", borderRadius: "0.375rem" }),
    menu: (base: any) => ({ ...(baseStyles.menu as any)(base), borderRadius: "0.5rem" }),
    valueContainer: (base: any) => ({ ...base, padding: "0 8px" }),
  } as any;

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-3 rounded-lg p-3">
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs text-text-lo">Scrape a new URL, or pick one you're already tracking.</span>
        <Link href="/website-sources" className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
          View tracked sources
          <Icon icon="solar:arrow-right-broken" width={12} />
        </Link>
      </div>

      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={urlPlaceholder} className={`${inputClass} flex-1`} />
        {sourceOptions.length > 0 && (
          <div className="w-56 shrink-0">
            <Select<SourceOption>
              value={null}
              onChange={(opt) => {
                if (!opt) return;
                const source = sources.find((s) => s.id === opt.value);
                if (source) onSelectSource?.(source);
              }}
              options={sourceOptions}
              placeholder="Existing source…"
              isSearchable
              isClearable={false}
              styles={compactSelectStyles}
              classNamePrefix="react-select"
              formatOptionLabel={(opt) => (
                <div className="flex items-center gap-2">
                  <Icon icon="solar:global-broken" width={14} className="shrink-0 text-text-lo" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{opt.label}</span>
                    <span className="truncate font-mono text-[10px] text-text-lo">{opt.url}</span>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-1 text-xs text-text-lo hover:text-text-hi transition-colors"
        >
          <Icon icon={showDetails ? "solar:alt-arrow-up-broken" : "solar:alt-arrow-down-broken"} width={12} />
          {showDetails ? "Hide details" : "Add name & location"}
        </button>
      </div>

      {showDetails && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={`${inputClass} flex-1`} />
          <LocationInput value={location} onChange={setLocation} countries={countries} mode={mode} className="w-full sm:w-56 shrink-0" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
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
