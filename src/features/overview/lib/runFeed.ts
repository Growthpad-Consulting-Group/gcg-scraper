import type { BadgeStatus } from "@/shared/ui/Badge";

export type JobKind = "search-query" | "tender-source" | "tender-website" | "gmb-leads" | "linkedin-leads";

export interface RunJob {
  id: string;
  task_id: number | null;
  kind: JobKind;
  label: string | null;
  status: "queued" | "running" | "done" | "error" | "canceled";
  progress: { visited?: number; total?: number; current_url?: string } | null;
  result_summary: Record<string, number> | null;
  created_at: string;
  finished_at: string | null;
}

export const KIND_LABEL: Record<JobKind, string> = {
  "search-query": "Search Query",
  "tender-source": "Tender Source",
  "tender-website": "Website Tenders",
  "gmb-leads": "GMB Leads",
  "linkedin-leads": "LinkedIn Leads",
};

export const STATUS_BADGE: Record<RunJob["status"], BadgeStatus> = {
  queued: "info",
  running: "warning",
  done: "success",
  error: "danger",
  canceled: "neutral",
};

export function runItemCount(job: RunJob): number | null {
  const s = job.result_summary;
  if (!s) return null;
  return s.totalTenders ?? s.leads ?? s.urls_visited ?? null;
}

export function runDuration(job: RunJob): string | null {
  if (!job.finished_at) return null;
  const ms = new Date(job.finished_at).getTime() - new Date(job.created_at).getTime();
  if (ms < 0) return null;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
