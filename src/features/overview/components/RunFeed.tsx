"use client";

import { Fragment, useState } from "react";
import { Icon } from "@iconify/react";
import Badge from "@/shared/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/shared/ui/Table";
import LogPanel from "@/shared/ui/LogPanel";
import { KIND_LABEL, STATUS_BADGE, runItemCount, runDuration, relativeTime, type RunJob } from "@/features/overview/lib/runFeed";

export default function RunFeed({ jobs, isLoading }: { jobs: RunJob[]; isLoading: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          const duration = runDuration(job);
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
                <TableTd mono>{duration ?? (job.status === "running" || job.status === "queued" ? "…" : "—")}</TableTd>
                <TableTd>
                  <Icon icon={expanded ? "solar:alt-arrow-up-broken" : "solar:alt-arrow-down-broken"} width={14} className="text-text-lo" />
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
                        job.status === "error" ? { text: "job failed — check server logs", tone: "danger" } : null,
                        job.status === "done" ? { text: "completed", tone: "success" } : null,
                      ].filter((l): l is { text: string; tone: "info" | "default" | "danger" | "success" } => l !== null)}
                    />
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
