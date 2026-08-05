"use client";

import { Icon } from "@iconify/react";

export const RUN_MODES = [
  { id: "search-query", label: "Search Query", icon: "solar:database-broken" },
  { id: "website", label: "Website", icon: "solar:global-broken" },
  { id: "gmb-leads", label: "Business Leads", icon: "solar:map-point-broken" },
  { id: "linkedin-leads", label: "People Leads", icon: "mdi:linkedin" },
] as const;

export type RunMode = (typeof RUN_MODES)[number]["id"];

export function isRunMode(value: string | null): value is RunMode {
  return RUN_MODES.some((m) => m.id === value);
}

/** Firecrawl-playground-style mode switcher: one page, several input shapes. */
export default function RunModeSwitcher({ mode, onChange }: { mode: RunMode; onChange: (mode: RunMode) => void }) {
  return (
    <div className="inline-flex w-fit flex-wrap gap-1 rounded-lg border border-app-border bg-surface-2 p-1">
      {RUN_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === m.id ? "bg-surface text-text-hi shadow-sm" : "text-text-lo hover:text-text-hi"
          }`}
        >
          <Icon icon={m.icon} width={15} />
          {m.label}
        </button>
      ))}
    </div>
  );
}
