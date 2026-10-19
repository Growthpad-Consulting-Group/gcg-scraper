"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import Badge, { type BadgeStatus } from "@/shared/ui/Badge";
import GlassPanel from "@/shared/ui/GlassPanel";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface ScrapeJob {
  id: string;
  kind: string | null;
  label: string | null;
  status: string;
  result_summary: Record<string, unknown> | null;
  created_at: string;
  finished_at: string | null;
}

const KIND_ICON: Record<string, string> = {
  "search-query":   "solar:database-broken",
  "tender-source":  "solar:server-broken",
  "website":        "solar:global-broken",
  "document":       "solar:file-text-broken",
  "gmb-leads":      "solar:map-point-broken",
  "linkedin-leads": "mdi:linkedin",
  "reddit-leads":   "mdi:reddit",
};

function statusBadge(status: string): { label: string; badge: BadgeStatus } {
  if (status === "done")     return { label: "Done",     badge: "success" };
  if (status === "running")  return { label: "Running",  badge: "info" };
  if (status === "error")    return { label: "Error",    badge: "danger" };
  if (status === "canceled") return { label: "Canceled", badge: "neutral" };
  return { label: status, badge: "neutral" };
}

function resultCount(job: ScrapeJob): string | null {
  const s = job.result_summary;
  if (!s) return null;
  const isLeads = job.kind?.includes("leads");
  if (isLeads) {
    const n = (s.leadsFound ?? s.inserted ?? s.totalFound) as number | undefined;
    return n != null ? `${n} lead${n !== 1 ? "s" : ""}` : null;
  }
  const n = (s.inserted ?? s.tendersFound ?? s.totalFound) as number | undefined;
  return n != null ? `${n} tender${n !== 1 ? "s" : ""}` : null;
}

function resultsHref(job: ScrapeJob): string {
  if (job.kind?.includes("leads")) return `/leads?job=${job.id}`;
  return `/tenders?job=${job.id}`;
}

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function RecentRunsPanel({ jobs, loading }: { jobs: ScrapeJob[]; loading: boolean }) {
  const { resolvedMode: mode } = useTheme();

  if (!loading && jobs.length === 0) return null;

  return (
    <GlassPanel mode={mode} className="rounded-2xl p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-lo">Recent Runs</p>
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {jobs.map((job) => {
            const icon = KIND_ICON[job.kind ?? ""] ?? "solar:database-broken";
            const { label: statusLabel, badge } = statusBadge(job.status);
            const count = resultCount(job);
            return (
              <Link
                key={job.id}
                href={resultsHref(job)}
                className="flex items-center gap-3 rounded-xl border border-app-border bg-surface px-3 py-2 text-sm transition-colors hover:border-brand-500/30 hover:bg-brand-500/5"
              >
                <Icon icon={icon} width={15} className="shrink-0 text-text-lo" />
                <span className="flex-1 truncate font-medium text-text-hi">{job.label ?? job.kind ?? "Run"}</span>
                {count && <span className="shrink-0 text-xs text-text-lo">{count}</span>}
                <Badge status={badge}>{statusLabel}</Badge>
                <span className="shrink-0 text-[11px] text-text-lo">{formatRelativeTime(job.created_at)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
