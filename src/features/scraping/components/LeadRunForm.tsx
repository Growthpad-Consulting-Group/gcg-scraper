"use client";

import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";
import GlassPanel from "@/shared/ui/GlassPanel";
import LocationInput from "./LocationInput";
import useTypewriterPlaceholder from "@/shared/hooks/useTypewriterPlaceholder";

const inputClass = "h-9 flex-1 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

const GMB_EXAMPLES = ["car dealerships", "construction companies", "IT consultancies", "logistics firms"];
const LINKEDIN_EXAMPLES = ["procurement manager", "supply chain director", "purchasing officer", "category manager"];
const REDDIT_EXAMPLES = ["tender procurement Kenya", "RFP government contract", "sourcing suppliers needed"];

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
  mode,
  countries = [],
}: {
  kind: "gmb" | "linkedin" | "reddit";
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  maxResults: number;
  setMaxResults: (v: number) => void;
  isRunning: boolean;
  onRun: () => void;
  mode?: "light" | "dark";
  countries?: string[];
}) {
  const canRun = searchTerm.trim().length > 0;
  const locationPlaceholder = kind === "gmb" ? "e.g. Nairobi, Kenya" : "e.g. Kenya";
  const examples = kind === "gmb" ? GMB_EXAMPLES : kind === "linkedin" ? LINKEDIN_EXAMPLES : REDDIT_EXAMPLES;
  const searchTermPlaceholder = useTypewriterPlaceholder(examples, searchTerm.length === 0);

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-3 rounded-lg p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={searchTermPlaceholder} className={inputClass} />
        {kind !== "reddit" && (
          <LocationInput value={location} onChange={setLocation} countries={countries} placeholder={locationPlaceholder} mode={mode} className="w-full sm:w-56 shrink-0" />
        )}
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
    </GlassPanel>
  );
}
