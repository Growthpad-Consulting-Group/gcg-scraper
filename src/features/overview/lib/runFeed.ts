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

/** Whether this job actually rejected anything worth inspecting via the rejected_tenders table —
 * gates showing the "View rejected candidates" toggle so it doesn't appear on jobs with nothing
 * to show (rejectedBy is only ever set on result_summary when at least one candidate was rejected). */
export function hasRejectedCandidates(job: RunJob): boolean {
  return typeof job.result_summary?.rejectedBy === "string";
}

/** result_summary is computed and stored for every job (tenders found, open/closed split, URLs
 * visited/skipped, leads found, ...) but the expanded panel only ever surfaced a sliver of it via
 * runItemCount — this turns whatever's actually present into readable lines, kind-agnostic since
 * the shape varies (tender-source/website have tendersFound+open/closed, search-query adds
 * urls_visited/urlsSkipped, leads flows just have leadsFound). */
export function resultSummaryLines(job: RunJob): string[] {
  const s = job.result_summary;
  if (!s) return [];
  const lines: string[] = [];

  if (typeof s.tendersFound === "number") {
    const split =
      typeof s.openTenders === "number" && typeof s.closedTenders === "number" ? ` (${s.openTenders} open, ${s.closedTenders} closed)` : "";
    lines.push(`tenders found: ${s.tendersFound}${split}`);
  }
  if (typeof s.totalExtracted === "number" && s.totalExtracted !== s.tendersFound) {
    lines.push(`extracted ${s.totalExtracted} raw, ${s.tendersFound ?? 0} new after de-dup/filtering`);
    // Breaks down *why* raw extractions didn't become new tenders — which backstop rejected them
    // (rejectedBy) vs. how many passed every filter but were already in the DB (droppedAsDuplicate)
    // — so "0 new" is diagnosable from the job log instead of needing a database query.
    if (typeof s.rejectedBy === "string") lines.push(`rejected: ${s.rejectedBy}`);
    if (typeof s.droppedAsDuplicate === "number" && s.droppedAsDuplicate > 0) {
      lines.push(`${s.droppedAsDuplicate} passed all filters but already existed (duplicate)`);
    }
  }
  if (typeof s.leadsFound === "number") lines.push(`leads found: ${s.leadsFound}`);
  if (typeof s.websitesProcessed === "number") lines.push(`websites processed: ${s.websitesProcessed}`);
  if (typeof s.urls_visited === "number") {
    const skipped = typeof s.urlsSkipped === "number" && s.urlsSkipped > 0 ? `, ${s.urlsSkipped} skipped (blocked domains)` : "";
    lines.push(`urls visited: ${s.urls_visited}${skipped}`);
  }
  if (typeof s.apifyStatus === "string") lines.push(`apify status: ${s.apifyStatus}`);

  return lines;
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
