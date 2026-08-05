"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/shared/ui/Table";
import LogPanel from "@/shared/ui/LogPanel";
import { KIND_LABEL, STATUS_BADGE, runItemCount, runDuration, runErrorMessage, relativeTime, resultsHref, type RunJob } from "@/features/overview/lib/runFeed";

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

  if (isLoading) {
    return <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">Loading run feed…</div>;
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">
        No runs yet — start one from Run Query or the Scheduler.
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
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
          const canRetry = (job.status === "error" || job.status === "canceled") && job.task_id != null;
          return (
            <Fragment key={job.id}>
              <TableRow className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : job.id)}>
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
                        job.progress?.current_url
                          ? { text: `current_url: ${job.progress.current_url}`, tone: "default" }
                          : { text: "no progress payload yet", tone: "default" },
                        job.progress?.total
                          ? { text: `progress: ${job.progress.visited ?? 0}/${job.progress.total}`, tone: "default" }
                          : { text: "progress: —", tone: "default" },
                        job.status === "error" ? { text: errorMessage ? `error: ${errorMessage}` : "job failed — no error message captured", tone: "danger" } : null,
                        job.status === "done" ? { text: "completed", tone: "success" } : null,
                      ].filter((l): l is { text: string; tone: "info" | "default" | "danger" | "success" } => l !== null)}
                    />
                    <div className="mt-2 flex gap-2">
                      {job.status === "done" && (
                        <Link href={resultsHref(job)}>
                          <Button size="sm" variant="secondary">
                            <Icon icon="solar:arrow-right-broken" width={14} />
                            View {job.kind === "gmb-leads" || job.kind === "linkedin-leads" ? "leads" : "tenders"}
                          </Button>
                        </Link>
                      )}
                      {canRetry && <RetryButton taskId={job.task_id as number} onDone={onRefresh} />}
                    </div>
                  </TableTd>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
