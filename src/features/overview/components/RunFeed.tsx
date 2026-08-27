"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/shared/ui/Table";
import LogPanel from "@/shared/ui/LogPanel";
import {
  KIND_LABEL,
  STATUS_BADGE,
  runItemCount,
  runDuration,
  runErrorMessage,
  resultSummaryLines,
  relativeTime,
  resultsHref,
  hasRejectedCandidates,
  type RunJob,
} from "@/features/overview/lib/runFeed";

const REASON_LABEL: Record<string, string> = {
  no_url: "no URL",
  country: "country mismatch",
  keywords: "keyword mismatch",
  source_content: "not verifiably on the page",
};

interface RejectedTender {
  id: number;
  title: string;
  source_url: string | null;
  organization: string | null;
  category: string | null;
  location: string | null;
  reason: string;
  rejected_at: string;
}

/** Lazily fetches this one job's rejected candidates only once actually expanded — most jobs
 * rejected nothing, and even ones that did are only worth the extra request when someone's
 * actually asking "why", not on every job in the feed by default. */
function RejectedCandidates({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RejectedTender[] | null>(null);

  const toggle = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (rows !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/rejected`);
      const data = await res.json();
      setRows(Array.isArray(data.rejected) ? data.rejected : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-brand-500 hover:underline"
      >
        <Icon icon={open ? "solar:alt-arrow-up-broken" : "solar:alt-arrow-down-broken"} width={12} />
        {open ? "Hide" : "View"} rejected candidates
      </button>
      {open && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-app-border" onClick={(e) => e.stopPropagation()}>
          {loading ? (
            <p className="p-3 text-xs text-text-lo">Loading…</p>
          ) : !rows || rows.length === 0 ? (
            <p className="p-3 text-xs text-text-lo">No rejected candidates were logged for this run.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="p-2 text-left font-mono uppercase tracking-wide text-text-lo">Title</th>
                  <th className="p-2 text-left font-mono uppercase tracking-wide text-text-lo">Reason</th>
                  <th className="p-2 text-left font-mono uppercase tracking-wide text-text-lo">Org / Location</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-app-border">
                    <td className="max-w-[280px] truncate p-2 text-text-hi" title={r.title}>
                      {r.source_url ? (
                        <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                    </td>
                    <td className="whitespace-nowrap p-2 text-text-lo">{REASON_LABEL[r.reason] || r.reason}</td>
                    <td className="max-w-[200px] truncate p-2 text-text-lo">{[r.organization, r.location].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function CancelButton({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const [isCanceling, setIsCanceling] = useState(false);
  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      toast.success("Canceling — will stop after its current step.");
      onDone();
    } catch (err: any) {
      toast.error("Failed to cancel: " + err.message);
    } finally {
      setIsCanceling(false);
    }
  };
  return (
    <Button size="sm" variant="danger" onClick={handleCancel} disabled={isCanceling}>
      <Icon icon={isCanceling ? "mdi:loading" : "solar:stop-circle-broken"} width={14} className={isCanceling ? "animate-spin" : ""} />
      Cancel
    </Button>
  );
}

function RetryButton({ taskId, onDone }: { taskId: number; onDone: () => void }) {
  const [isRetrying, setIsRetrying] = useState(false);
  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/scheduled-tasks/${taskId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start run");
      toast.success("Retrying…");
      onDone();
    } catch (err: any) {
      toast.error("Failed to retry: " + err.message);
    } finally {
      setIsRetrying(false);
    }
  };
  return (
    <Button size="sm" variant="secondary" onClick={handleRetry} disabled={isRetrying}>
      <Icon icon={isRetrying ? "mdi:loading" : "solar:restart-broken"} width={14} className={isRetrying ? "animate-spin" : ""} />
      Retry
    </Button>
  );
}

export default function RunFeed({ jobs, isLoading, onRefresh }: { jobs: RunJob[]; isLoading: boolean; onRefresh: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Ticks independent of the parent's data poll so a running job's duration counts up smoothly
  // (10s, 11s, 12s...) instead of jumping once per 15s refresh (10s → 25s). Only runs while
  // something is actually running, since it's pointless overhead otherwise.
  const hasRunningJob = jobs.some((j) => j.status === "running");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasRunningJob) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunningJob]);

  // No card chrome (border/bg/padding) here — the parent on the Overview page now supplies that,
  // matching the sidebar cards' "title inside the card" look instead of a separate boxed table.
  if (isLoading) {
    return <p className="h-full text-sm text-text-lo">Loading run feed…</p>;
  }

  if (jobs.length === 0) {
    return <p className="h-full text-sm text-text-lo">No runs yet — start one from Run Query or Automation.</p>;
  }

  return (
    // min-h keeps it from collapsing to near-zero if the sidebar is ever short; max-h is a
    // defensive cap so it can never run away and fill the viewport regardless of layout context.
    <div className="h-full min-h-[320px] max-h-[80vh] overflow-y-auto [&>div]:rounded-none [&>div]:border-0">
    <Table>
      <TableHead className="sticky top-0 z-10">
        <TableRow>
          <TableTh>Source</TableTh>
          <TableTh>Status</TableTh>
          <TableTh>Started</TableTh>
          <TableTh>Items</TableTh>
          <TableTh>Duration</TableTh>
          <TableTh />
        </TableRow>
      </TableHead>
      <TableBody>
        {jobs.map((job) => {
          const expanded = expandedId === job.id;
          const items = runItemCount(job);
          const duration = runDuration(job, now);
          const errorMessage = runErrorMessage(job);
          const summaryLines = resultSummaryLines(job);
          const canRetry = (job.status === "error" || job.status === "canceled") && job.task_id != null;
          return (
            <Fragment key={job.id}>
              <TableRow className="cursor-pointer hover:!bg-brand-500/5" onClick={() => setExpandedId(expanded ? null : job.id)}>
                <TableTd>
                  <div className="flex flex-col">
                    <span className="truncate font-medium text-text-hi">{job.label || KIND_LABEL[job.kind]}</span>
                    <span className="font-mono text-[11px] text-text-lo">{KIND_LABEL[job.kind]}</span>
                  </div>
                </TableTd>
                <TableTd>
                  <Badge status={STATUS_BADGE[job.status]}>
                    {job.status}
                    {job.status === "running" && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 animate-ping rounded-full bg-status-warning" />
                    )}
                  </Badge>
                </TableTd>
                <TableTd mono>{relativeTime(job.created_at)}</TableTd>
                <TableTd mono>{items ?? "—"}</TableTd>
                <TableTd mono>{duration ?? (job.status === "queued" ? "…" : "—")}</TableTd>
                <TableTd onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {job.status === "done" && (
                      <Link href={resultsHref(job)} className="font-mono text-[11px] uppercase tracking-wide text-brand-500 hover:underline">
                        View
                      </Link>
                    )}
                    {(job.status === "queued" || job.status === "running") && <CancelButton jobId={job.id} onDone={onRefresh} />}
                    {canRetry && <RetryButton taskId={job.task_id as number} onDone={onRefresh} />}
                    <button onClick={() => setExpandedId(expanded ? null : job.id)} aria-label="Toggle details">
                      <Icon icon={expanded ? "solar:alt-arrow-up-broken" : "solar:alt-arrow-down-broken"} width={14} className="text-text-lo" />
                    </button>
                  </div>
                </TableTd>
              </TableRow>
              {expanded && (
                <TableRow className="h-auto hover:bg-transparent">
                  <TableTd colSpan={6} className="bg-canvas p-3">
                    <LogPanel
                      autoScroll={false}
                      className="min-h-0"
                      lines={[
                        { text: `job ${job.id}`, tone: "info" },
                        { text: `kind: ${job.kind}`, tone: "default" },
                        // tender-source jobs are a single Firecrawl call with no incremental
                        // visited/total progress to report — showing "no progress payload
                        // yet"/"progress: —" there reads as stuck rather than just single-step.
                        job.kind === "tender-source"
                          ? job.status === "running"
                            ? { text: `stage: ${job.progress?.stage ?? "extracting"}`, tone: "default" as const }
                            : null
                          : job.progress?.current_url
                            ? { text: `current_url: ${job.progress.current_url}`, tone: "default" as const }
                            : { text: "no progress payload yet", tone: "default" as const },
                        job.kind === "tender-source"
                          ? null
                          : job.progress?.total
                            ? { text: `progress: ${job.progress.visited ?? 0}/${job.progress.total}`, tone: "default" as const }
                            : { text: "progress: —", tone: "default" as const },
                        ...summaryLines.map((text) => ({ text, tone: "default" as const })),
                        job.status === "error" ? { text: errorMessage ? `error: ${errorMessage}` : "job failed — no error message captured", tone: "danger" } : null,
                        job.status === "done" ? { text: "completed", tone: "success" } : null,
                      ].filter((l): l is { text: string; tone: "info" | "default" | "danger" | "success" } => l !== null)}
                    />
                    <div className="mt-2 flex gap-2">
                      {job.status === "done" && (
                        <Link href={resultsHref(job)}>
                          <Button size="sm">
                            <Icon icon="solar:arrow-right-broken" width={14} />
                            View {job.kind === "gmb-leads" || job.kind === "linkedin-leads" ? "leads" : "tenders"}
                          </Button>
                        </Link>
                      )}
                      {canRetry && <RetryButton taskId={job.task_id as number} onDone={onRefresh} />}
                    </div>
                    {hasRejectedCandidates(job) && <RejectedCandidates jobId={job.id} />}
                  </TableTd>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}
