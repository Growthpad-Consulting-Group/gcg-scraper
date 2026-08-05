"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";

export default function LinkedInSearchForm({
  isRunning,
  onSubmit,
}: {
  isRunning: boolean;
  onSubmit: (searchQuery: string, location: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onSubmit(searchQuery.trim(), location.trim());
  };

  const inputClass =
    "w-full rounded-md border border-app-border bg-canvas px-3 py-2 text-sm text-text-hi placeholder:text-text-lo focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-app-border bg-surface p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-hi">
        <Icon icon="mdi:linkedin" width={18} className="text-brand-500" />
        Find People Leads (LinkedIn)
      </h3>
      <p className="mb-3 text-xs text-text-lo">
        Searches public LinkedIn profiles only (no login used). Results can be partial or occasionally empty — LinkedIn search coverage varies by query.
      </p>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-lo">Job title / search query</label>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. procurement manager" className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-lo">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kenya" className={inputClass} />
        </div>
      </div>
      <Button type="submit" disabled={isRunning}>
        <Icon icon={isRunning ? "mdi:loading" : "solar:magnifer-broken"} width={16} className={isRunning ? "animate-spin" : ""} />
        {isRunning ? "Searching…" : "Find Leads"}
      </Button>
    </form>
  );
}
