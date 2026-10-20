"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import Button from "@/shared/ui/Button";
import LogPanel from "@/shared/ui/LogPanel";
import {
  KIND_LABEL,
  runItemCount,
  runDuration,
  runErrorMessage,
  resultSummaryLines,
  relativeTime,
  resultsHref,
  hasRejectedCandidates,
  hasResults,
  isSkippedJob,
  skippedReason,
  type RunJob,
} from "@/features/overview/lib/runFeed";

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_LABEL: Record<string, string> = {
  no_url: "No URL",
  country: "Country mismatch",
  keywords: "Keyword mismatch",
  source_content: "Not verifiably on page",
};

const REASON_COLOR: Record<string, string> = {
  no_url: "text-text-lo border-app-border bg-surface-2",
  country: "text-status-info border-status-info/30 bg-status-info/10",
  keywords: "text-status-warning border-status-warning/30 bg-status-warning/10",
  source_content: "text-status-danger border-status-danger/30 bg-status-danger/10",
};

const STATUS_CONFIG: Record<RunJob["status"], {
  label: string;
  icon: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  ringColor: string;
  pulse: boolean;
}> = {
  running: {
    label: "Live",
    icon: "solar:play-circle-bold",
    gradient: "from-amber-500 to-orange-400",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    badgeText: "text-amber-400",
    ringColor: "rgba(245,158,11,0.4)",
    pulse: true,
  },
  queued: {
    label: "Queued",
    icon: "solar:clock-circle-bold",
    gradient: "from-blue-500 to-blue-400",
    badgeBg: "bg-blue-500/15 border-blue-500/30",
    badgeText: "text-blue-400",
    ringColor: "rgba(59,130,246,0.4)",
    pulse: true,
  },
  done: {
    label: "Done",
    icon: "solar:check-circle-bold",
    gradient: "from-emerald-500 to-emerald-400",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    badgeText: "text-emerald-400",
    ringColor: "transparent",
    pulse: false,
  },
  error: {
    label: "Failed",
    icon: "solar:close-circle-bold",
    gradient: "from-red-500 to-red-400",
    badgeBg: "bg-red-500/15 border-red-500/30",
    badgeText: "text-red-400",
    ringColor: "transparent",
    pulse: false,
  },
  canceled: {
    label: "Canceled",
    icon: "solar:stop-circle-bold",
    gradient: "from-slate-500 to-slate-400",
    badgeBg: "bg-surface-2 border-app-border/40",
    badgeText: "text-text-lo",
    ringColor: "transparent",
    pulse: false,
  },
};

const SKIPPED_CONFIG = {
  label: "Skipped",
  icon: "solar:skip-next-broken",
  gradient: "from-slate-400 to-slate-300",
  badgeBg: "bg-surface-2 border-app-border/40",
  badgeText: "text-text-lo",
  ringColor: "transparent",
  pulse: false,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resultCount(job: RunJob): string | null {
  const items = runItemCount(job);
  if (items == null) return null;
  const noun = job.kind === "gmb-leads" || job.kind === "linkedin-leads" ? "leads" : "tenders";
  return `${items.toLocaleString()} ${noun}`;
}

function progressLine(job: RunJob): string {
  if (job.status === "queued") return "Waiting to start…";
  if (job.status === "canceled") {
    const reason = skippedReason(job);
    return reason ? `Skipped — ${reason}` : "Canceled";
  }
  if (job.status === "running") {
    const { stage, visited, total } = job.progress ?? {};
    if (visited != null && total) return `${stage ? stage + " · " : ""}${visited} / ${total} pages`;
    return stage ? `${stage}…` : "Running…";
  }
  if (job.status === "error") {
    const msg = runErrorMessage(job);
    return msg ? msg.slice(0, 80) : "Run failed";
  }
  const count = resultCount(job);
  if (count) return count + " found";
  return resultSummaryLines(job)[0] ?? "Completed";
}

function progressPct(job: RunJob): number | null {
  if (job.status !== "running") return null;
  const { visited, total } = job.progress ?? {};
  if (visited == null || !total) return null;
  return Math.min(100, Math.round((visited / total) * 100));
}

function groupJobs(jobs: RunJob[]): { label: string; jobs: RunJob[] }[] {
  const live: RunJob[] = [];
  const today: RunJob[] = [];
  const earlier: RunJob[] = [];
  const todayStr = new Date().toDateString();

  for (const j of jobs) {
    if (j.status === "running" || j.status === "queued") {
      live.push(j);
    } else if (new Date(j.created_at).toDateString() === todayStr) {
      today.push(j);
    } else {
      earlier.push(j);
    }
  }

  const groups: { label: string; jobs: RunJob[] }[] = [];
  if (live.length)    groups.push({ label: "Live", jobs: live });
  if (today.length)   groups.push({ label: "Today", jobs: today });
  if (earlier.length) groups.push({ label: "Earlier", jobs: earlier });
  return groups;
}

// ─── Rejected candidates hook ─────────────────────────────────────────────────

interface RejectedTender {
  id: number;
  title: string;
  source_url: string | null;
  organization: string | null;
  location: string | null;
  reason: string;
}

function useRejectedCandidates(jobId: string) {
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

  return { open, loading, rows, toggle };
}

// ─── Rejected candidates drawer ───────────────────────────────────────────────

function RejectedDrawer({ loading, rows, onClose, jobId }: { loading: boolean; rows: RejectedTender[] | null; onClose: () => void; jobId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mt-3 rounded-2xl border border-status-warning/25 bg-gradient-to-b from-status-warning/8 to-transparent">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-status-warning/20">
              <Icon icon="solar:danger-triangle-broken" width={14} className="text-status-warning" />
            </div>
            <span className="text-xs font-bold text-status-warning">Rejected candidates</span>
            {rows !== null && rows.length > 0 && (
              <span className="rounded-lg bg-status-warning/20 px-2 py-0.5 font-mono text-[10px] font-bold text-status-warning">
                {rows.length}
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-text-lo transition-colors hover:bg-surface-2 hover:text-text-hi"
          >
            <Icon icon="solar:close-circle-broken" width={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 px-4 pb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-text-lo">No rejected candidates logged for this run.</p>
        ) : (
          <>
            <div className="max-h-52 overflow-y-auto px-4">
              <div className="flex flex-col gap-1.5 pb-1">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-app-border/40 bg-surface/80 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-text-hi" title={r.title}>
                        {r.source_url
                          ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 hover:underline">{r.title}</a>
                          : r.title}
                      </p>
                      {(r.organization || r.location) && (
                        <p className="mt-0.5 truncate font-mono text-[10px] text-text-lo">
                          {[r.organization, r.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide",
                      REASON_COLOR[r.reason] ?? "text-text-lo border-app-border bg-surface-2"
                    )}>
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-status-warning/15 px-4 py-2.5">
              <span className="font-mono text-[10px] text-text-lo">{rows.length} candidate{rows.length !== 1 ? "s" : ""}</span>
              <Link
                href={`/rejected-candidates?job_id=${jobId}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 font-mono text-[10px] font-semibold text-status-warning transition-colors hover:text-amber-300"
              >
                View full page <Icon icon="solar:arrow-right-broken" width={11} />
              </Link>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function CancelButton({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      toast.success("Canceling — will stop after its current step.");
      onDone();
    } catch (err: any) {
      toast.error("Failed to cancel: " + err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" variant="danger" onClick={handle} disabled={busy}>
      <Icon icon={busy ? "mdi:loading" : "solar:stop-circle-broken"} width={14} className={busy ? "animate-spin" : ""} />
      Cancel
    </Button>
  );
}

function RetryButton({ taskId, onDone }: { taskId: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await fetch(`/api/scheduled-tasks/${taskId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start run");
      toast.success("Retrying…");
      onDone();
    } catch (err: any) {
      toast.error("Failed to retry: " + err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" variant="secondary" onClick={handle} disabled={busy}>
      <Icon icon={busy ? "mdi:loading" : "solar:restart-broken"} width={14} className={busy ? "animate-spin" : ""} />
      Retry
    </Button>
  );
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  expanded,
  onToggle,
  now,
  onRefresh,
  index,
}: {
  job: RunJob;
  expanded: boolean;
  onToggle: () => void;
  now: number;
  onRefresh: () => void;
  index: number;
}) {
  const skipped = isSkippedJob(job);
  const cfg = skipped ? SKIPPED_CONFIG : STATUS_CONFIG[job.status];
  const duration = runDuration(job, now);
  const canRetry = !skipped && (job.status === "error" || job.status === "canceled") && job.task_id != null;
  const rejected = useRejectedCandidates(job.id);
  const showRej = hasRejectedCandidates(job);
  const isActive = job.status === "running" || job.status === "queued";
  const isError = job.status === "error";
  const count = resultCount(job);
  const pct = progressPct(job);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      {/* ── Card shell ── */}
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer",
          expanded
            ? "border-app-border/60 bg-surface/90 shadow-lg shadow-black/8"
            : "border-app-border/30 bg-surface/60 hover:border-app-border/60 hover:bg-surface/90 hover:shadow-md hover:shadow-black/5"
        )}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
      >
        {/* Live glow stripe */}
        {isActive && (
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${cfg.ringColor}, transparent)` }}
          />
        )}

        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Icon with optional pulse ring */}
          <div className="relative shrink-0">
            {cfg.pulse && (
              <span
                className="absolute inset-0 rounded-2xl animate-ping opacity-30"
                style={{ backgroundColor: cfg.ringColor }}
              />
            )}
            <div className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
              cfg.gradient
            )}>
              <Icon icon={cfg.icon} width={16} className="text-white" />
            </div>
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-text-hi">
                {job.label || KIND_LABEL[job.kind]}
              </p>
              {isActive && (
                <span className={cn(
                  "shrink-0 rounded-lg border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  cfg.badgeBg, cfg.badgeText
                )}>
                  {cfg.label}
                </span>
              )}
            </div>
            <p className={cn(
              "mt-0.5 truncate text-xs",
              isError ? "text-status-danger/80" : "text-text-lo"
            )}>
              {KIND_LABEL[job.kind]}
              {" · "}
              {relativeTime(job.created_at)}
              {duration ? ` · ${duration}` : ""}
            </p>
          </div>

          {/* Right column */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {count && job.status === "done" && (
              <span className="text-sm font-semibold text-text-hi">{count}</span>
            )}
            {isActive && pct !== null && (
              <span className="font-mono text-xs font-bold text-text-hi">{pct}%</span>
            )}
            <div className="flex items-center gap-1.5">
              {showRej && (
                <span className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-status-warning">
                  ⚠ rej
                </span>
              )}
              {!isActive && (
                <span className={cn(
                  "rounded-lg border px-2 py-0.5 text-[10px] font-semibold",
                  cfg.badgeBg, cfg.badgeText
                )}>
                  {cfg.label}
                </span>
              )}
              <Icon
                icon="solar:alt-arrow-down-broken"
                width={14}
                className={cn(
                  "text-text-lo/40 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </div>
          </div>
        </div>

        {/* Live progress bar */}
        {isActive && (
          <div className="h-0.5 w-full overflow-hidden bg-surface-2">
            {pct !== null ? (
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ) : (
              <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
            )}
          </div>
        )}
      </div>

      {/* ── Expanded detail ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-1 rounded-2xl border border-app-border/30 bg-canvas/70 px-4 py-4 backdrop-blur-sm">
              {/* Live progress detail */}
              {isActive && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-app-border/30 bg-surface/60 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <p className="font-mono text-xs text-text-lo">{progressLine(job)}</p>
                </div>
              )}

              {/* Skipped reason */}
              {skipped && skippedReason(job) && (
                <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-text-lo/20 bg-surface-2/60 px-3 py-2.5">
                  <Icon icon="solar:skip-next-broken" width={14} className="mt-0.5 shrink-0 text-text-lo" />
                  <p className="font-mono text-xs text-text-lo">
                    {skippedReason(job)}
                  </p>
                </div>
              )}

              {/* Error message */}
              {isError && (
                <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-status-danger/20 bg-status-danger/8 px-3 py-2.5">
                  <Icon icon="solar:danger-circle-broken" width={14} className="mt-0.5 shrink-0 text-status-danger" />
                  <p className="font-mono text-xs text-status-danger">
                    {runErrorMessage(job) ?? "No error details captured"}
                  </p>
                </div>
              )}

              {/* Action strip */}
              <div className="flex flex-wrap items-center gap-2">
                {job.status === "done" && hasResults(job) && (
                  <Link href={resultsHref(job)}>
                    <Button size="sm">
                      <Icon icon="solar:document-text-broken" width={13} />
                      View {job.kind === "gmb-leads" || job.kind === "linkedin-leads" ? "leads" : "tenders"}
                    </Button>
                  </Link>
                )}
                {isActive && <CancelButton jobId={job.id} onDone={onRefresh} />}
                {canRetry && <RetryButton taskId={job.task_id as number} onDone={onRefresh} />}
                {showRej && !rejected.open && (
                  <button
                    onClick={(e) => { e.stopPropagation(); rejected.toggle(); }}
                    className="flex items-center gap-1.5 rounded-xl border border-status-warning/30 bg-status-warning/10 px-3 py-1.5 text-xs font-semibold text-status-warning transition-colors hover:bg-status-warning/20"
                  >
                    <Icon icon="solar:danger-triangle-broken" width={13} />
                    View rejected
                  </button>
                )}
                <span className="ml-auto font-mono text-[10px] text-text-lo/25 select-all">
                  {job.id.slice(0, 8)}
                </span>
              </div>

              {/* Raw log */}
              <details className="mt-3">
                <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-widest text-text-lo/40 hover:text-text-lo/70">
                  Raw log
                </summary>
                <div className="mt-2">
                  <LogPanel
                    autoScroll={false}
                    className="min-h-0"
                    lines={[
                      { text: `job: ${job.id}`, tone: "info" },
                      { text: `kind: ${job.kind}`, tone: "default" },
                      job.progress?.stage       ? { text: `stage: ${job.progress.stage}`, tone: "default" as const } : null,
                      job.progress?.current_url ? { text: `url: ${job.progress.current_url}`, tone: "default" as const } : null,
                      job.progress?.total       ? { text: `progress: ${job.progress.visited ?? 0}/${job.progress.total}`, tone: "default" as const } : null,
                      ...resultSummaryLines(job).map((text) => ({ text, tone: "default" as const })),
                      isError ? { text: runErrorMessage(job) ?? "failed", tone: "danger" as const } : null,
                      job.status === "done" ? { text: "completed", tone: "success" as const } : null,
                    ].filter((l): l is { text: string; tone: "info" | "default" | "danger" | "success" } => l !== null)}
                  />
                </div>
              </details>

              {/* Rejected drawer */}
              <AnimatePresence>
                {showRej && rejected.open && (
                  <RejectedDrawer
                    loading={rejected.loading}
                    rows={rejected.rows}
                    onClose={rejected.toggle}
                    jobId={job.id}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RunFeedSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-app-border/20 bg-surface/50 px-4 py-3.5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded-lg bg-surface-2" />
            <div className="h-3 w-28 animate-pulse rounded-lg bg-surface-2" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded-xl bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function FeedSection({ label, isLive }: { label: string; isLive?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-lo/50">{label}</span>
      <div className="h-px flex-1 bg-app-border/30" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RunFeed({
  jobs,
  isLoading,
  onRefresh,
}: {
  jobs: RunJob[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const hasRunningJob = jobs.some((j) => j.status === "running");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hasRunningJob) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunningJob]);

  if (isLoading) return <RunFeedSkeleton />;

  if (jobs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-xl shadow-brand-500/25">
          <Icon icon="solar:play-circle-broken" width={28} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-hi">No runs yet</p>
          <p className="mt-1 text-xs text-text-lo">Start a query from Run Query or set up Automation.</p>
        </div>
        <Link href="/run-query">
          <Button size="sm">
            <Icon icon="solar:play-circle-broken" width={14} />
            Start a run
          </Button>
        </Link>
      </div>
    );
  }

  const skippedCount = jobs.filter(isSkippedJob).length;
  const visibleJobs = showSkipped ? jobs : jobs.filter((j) => !isSkippedJob(j));
  const groups = groupJobs(visibleJobs);
  let globalIndex = 0;

  return (
    <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: "440px" }}>
      {skippedCount > 0 && (
        <button
          onClick={() => setShowSkipped((v) => !v)}
          className="flex items-center gap-1.5 self-end rounded-xl border border-app-border/30 bg-surface-2/60 px-2.5 py-1 text-[11px] text-text-lo transition-colors hover:text-text-hi"
        >
          <Icon icon={showSkipped ? "solar:eye-broken" : "solar:eye-closed-broken"} width={12} />
          {showSkipped ? `Hide skipped (${skippedCount})` : `Show skipped (${skippedCount})`}
        </button>
      )}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <FeedSection label={group.label} isLive={group.label === "Live"} />
          {group.jobs.map((job) => {
            const idx = globalIndex++;
            return (
              <JobCard
                key={job.id}
                job={job}
                expanded={expandedId === job.id}
                onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
                now={now}
                onRefresh={onRefresh}
                index={idx}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
