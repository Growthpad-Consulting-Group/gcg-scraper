"use client";

import { Icon } from "@iconify/react";
import TooltipIconButton from "@/shared/ui/TooltipIconButton";

export const RUN_MODES = [
  {
    id: "search-query",
    label: "Search Query",
    icon: "solar:database-broken",
    tooltip: "Build a query from keywords and search terms to find tenders across the web",
  },
  {
    id: "website",
    label: "Website",
    icon: "solar:global-broken",
    tooltip: "Scrape a specific website URL to extract tender listings directly",
  },
  {
    id: "document",
    label: "Parse",
    icon: "solar:file-text-broken",
    tooltip: "Upload a PDF, DOCX, XLSX or HTML file to extract tender data",
  },
  {
    id: "gmb-leads",
    label: "Business Leads",
    icon: "solar:map-point-broken",
    tooltip: "Search Google Maps to find local business leads by category and location",
  },
  {
    id: "linkedin-leads",
    label: "People Leads",
    icon: "mdi:linkedin",
    tooltip: "Search LinkedIn profiles to find people leads by role and location",
  },
  {
    id: "reddit-leads",
    label: "Reddit Mentions",
    icon: "mdi:reddit",
    tooltip: "Search Reddit for posts mentioning your keywords — surfaces opportunities and chatter tender search engines miss",
  },
] as const;

export type RunMode = (typeof RUN_MODES)[number]["id"];

export function isRunMode(value: string | null): value is RunMode {
  return RUN_MODES.some((m) => m.id === value);
}

/** Firecrawl-playground-style mode switcher: one page, several input shapes. */
export default function RunModeSwitcher({ mode, onChange }: { mode: RunMode; onChange: (mode: RunMode) => void }) {
  return (
    <div className="inline-flex w-fi flex-wrap gap-1 rounded-lg border border-app-border bg-surface-2 p-1 mb-2">
      {RUN_MODES.map((m) => (
        <TooltipIconButton
          key={m.id}
          label={m.tooltip}
          mode="dark"
          position="top"
          tooltipMaxWidth={220}
          onClick={() => onChange(m.id)}
          className={`!rounded-md !p-0 ${
            mode === m.id ? "bg-surface text-text-hi shadow-sm" : "text-text-lo hover:text-text-hi"
          }`}
        >
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium">
            <Icon icon={m.icon} width={15} className={mode === m.id ? "text-brand-500" : ""} />
            {m.label}
          </span>
        </TooltipIconButton>
      ))}
    </div>
  );
}
