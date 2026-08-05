"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Badge from "@/shared/ui/Badge";
import { KIND_LABEL, STATUS_BADGE, runItemCount, relativeTime, type RunJob } from "@/features/overview/lib/runFeed";

/** Shown on /tenders and /leads when arrived via a run's "View" link (?job=<id>) — names the
 * actual run instead of a generic "showing filtered results" sentence, since which run and when
 * it ran is exactly what you'd want to confirm you're looking at the right thing. */
export default function RunFilterBanner({ jobId, onClear, resultsNoun }: { jobId: string; onClear: () => void; resultsNoun: string }) {
  const [job, setJob] = useState<RunJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/jobs/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setJob(data.job ?? null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const items = job ? runItemCount(job) : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-app-border bg-surface px-3 py-2 text-sm">
      <Badge status="info">Filtered</Badge>
      {isLoading ? (
        <span className="text-text-lo">Loading run…</span>
      ) : job ? (
        <>
          <span className="font-medium text-text-hi">{job.label || KIND_LABEL[job.kind]}</span>
          <span className="font-mono text-[11px] text-text-lo">{KIND_LABEL[job.kind]}</span>
          <span className="text-text-lo">·</span>
          <span className="font-mono text-[11px] text-text-lo">{relativeTime(job.created_at)}</span>
          {job.status !== "done" && <Badge status={STATUS_BADGE[job.status]}>{job.status}</Badge>}
          {items != null && <span className="font-mono text-[11px] text-text-lo">{items} {resultsNoun}</span>}
        </>
      ) : (
        <span className="text-text-lo">Run not found — it may have been cleaned up.</span>
      )}
      <button onClick={onClear} className="ml-auto flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-brand-500 hover:underline">
        <Icon icon="mdi:close" width={12} />
        Clear filter
      </button>
    </div>
  );
}
