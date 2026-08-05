"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";

export default function LeadSearchForm({
  isRunning,
  onSubmit,
}: {
  isRunning: boolean;
  onSubmit: (searchTerm: string, location: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    onSubmit(searchTerm.trim(), location.trim());
  };

  const inputClass =
    "w-full rounded-md border border-app-border bg-canvas px-3 py-2 text-sm text-text-hi placeholder:text-text-lo focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-app-border bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-hi">
        <Icon icon="solar:map-point-broken" width={18} className="text-brand-500" />
        Find Business Leads (Google Maps)
      </h3>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-lo">Business type / search term</label>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g. car dealerships" className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-lo">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Nairobi, Kenya" className={inputClass} />
        </div>
      </div>
      <Button type="submit" disabled={isRunning}>
        <Icon icon={isRunning ? "mdi:loading" : "solar:magnifer-broken"} width={16} className={isRunning ? "animate-spin" : ""} />
        {isRunning ? "Searching…" : "Find Leads"}
      </Button>
    </form>
  );
}
