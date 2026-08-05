"use client";

import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";

const inputClass = "h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

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
  onRun: () => void;
}) {
  const canRun = url.trim().length > 0;

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
      <div className="flex items-center justify-between gap-2">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className={`${inputClass} w-56`}
        />
        <Button size="sm" onClick={onRun} disabled={isRunning || !canRun}>
          <Icon icon={isRunning ? "mdi:loading" : "solar:play-circle-broken"} width={15} className={isRunning ? "animate-spin" : ""} />
          {isRunning ? "Running…" : "Run"}
        </Button>
      </div>
    </div>
  );
}
