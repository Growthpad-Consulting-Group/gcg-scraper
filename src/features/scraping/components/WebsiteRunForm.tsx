"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";
import Popover from "@/shared/ui/Popover";
import type { ExtractOptions } from "@/features/tenders/api/firecrawlExtract";

const inputClass = "h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";
const optionInputClass = "h-8 w-28 rounded-md border border-app-border bg-canvas px-2 text-sm text-text-hi outline-none focus:border-brand-500";

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
}: {
  url: string;
  setUrl: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  isRunning: boolean;
  onRun: (options: ExtractOptions) => void;
}) {
  const canRun = url.trim().length > 0;

  const [onlyMainContent, setOnlyMainContent] = useState(true);
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

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-app-border bg-surface p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/tenders"
          className={`${inputClass} sm:col-span-2`}
        />
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
    </div>
  );
}
