import type { BadgeStatus } from "@/shared/ui/Badge";

export type JobKind = "search-query" | "tender-source" | "tender-website" | "gmb-leads" | "linkedin-leads";

export interface RunJob {
  id: string;
  task_id: number | null;
  kind: JobKind;
  label: string | null;
  status: "queued" | "running" | "done" | "error" | "canceled";
  progress: { visited?: number; total?: number; current_url?: string; stage?: string } | null;
  result_summary: Record<string, number | string> | null;
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
  const value = s.totalTenders ?? s.leadsFound ?? s.urls_visited ?? null;
  return typeof value === "number" ? value : null;
}

export function runErrorMessage(job: RunJob): string | null {
  const error = job.result_summary?.error;
  return typeof error === "string" ? error : null;
}

/** Where "View results" should send you for this job's kind — tender flows land on /tenders,
 * lead flows on /leads, filtered down to exactly what this run produced via ?job=<id>. Leads
 * also carry which tab (gmb/linkedin) to switch to, since the Leads page has two separate
 * tables and the job id alone doesn't say which one to show. */
export function resultsHref(job: Pick<RunJob, "id" | "kind">): string {
  if (job.kind === "gmb-leads") return `/leads?job=${job.id}&tab=gmb`;
  if (job.kind === "linkedin-leads") return `/leads?job=${job.id}&tab=linkedin`;
  return `/tenders?job=${job.id}`;
}

/** For finished jobs this is the real duration; for a `running` job it's elapsed-so-far. `now`
 * is injectable so a caller can tick it every second independent of whenever data actually
 * refreshes — otherwise the displayed duration only updates once per poll (e.g. jumps 10s → 25s
 * every 15s instead of counting smoothly). */
export function runDuration(job: RunJob, now: number = Date.now()): string | null {
  if (job.status === "queued") return null;
  const end = job.finished_at ? new Date(job.finished_at).getTime() : now;
  const ms = end - new Date(job.created_at).getTime();
  if (ms < 0) return null;

  const totalSecs = Math.round(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
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
