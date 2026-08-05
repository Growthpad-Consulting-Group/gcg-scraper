"use client";

import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";

const inputClass = "h-9 flex-1 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

export default function LeadRunForm({
  kind,
  searchTerm,
  setSearchTerm,
  location,
  setLocation,
  maxResults,
  setMaxResults,
  isRunning,
  onRun,
}: {
  kind: "gmb" | "linkedin";
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  maxResults: number;
  setMaxResults: (v: number) => void;
  isRunning: boolean;
  onRun: () => void;
}) {
  const canRun = searchTerm.trim().length > 0;
  const placeholder = kind === "gmb" ? "e.g. car dealerships" : "e.g. procurement manager";
  const locationPlaceholder = kind === "gmb" ? "e.g. Nairobi, Kenya" : "e.g. Kenya";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-app-border bg-surface p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={placeholder} className={inputClass} />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={locationPlaceholder} className={`${inputClass} sm:max-w-56`} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-text-lo">
          <Icon icon="solar:list-broken" width={15} />
          Max results
          <input
            type="number"
            min={1}
            max={200}
            value={maxResults}
            onChange={(e) => setMaxResults(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
            className="h-8 w-20 rounded-md border border-app-border bg-canvas px-2 text-sm text-text-hi outline-none focus:border-brand-500"
          />
        </label>
        <Button size="sm" onClick={onRun} disabled={isRunning || !canRun}>
          <Icon icon={isRunning ? "mdi:loading" : "solar:play-circle-broken"} width={15} className={isRunning ? "animate-spin" : ""} />
          {isRunning ? "Running…" : "Find Leads"}
        </Button>
      </div>
    </div>
  );
}
