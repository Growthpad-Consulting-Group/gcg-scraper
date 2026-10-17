"use client";

import Link from "next/link";
import type { SourceStat } from "@/features/overview/lib/dashboardStats";

interface Props {
  sources: SourceStat[];
  loading?: boolean;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
      <div className="h-3 w-3 animate-pulse rounded-full bg-surface-2" />
      <div className="h-3 w-24 animate-pulse rounded-lg bg-surface-2" />
      <div className="ml-auto h-2.5 w-20 animate-pulse rounded-full bg-surface-2" />
      <div className="h-3 w-8 animate-pulse rounded-lg bg-surface-2" />
    </div>
  );
}

export default function SourceBreakdown({ sources, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (sources.length === 0) {
    return <p className="text-sm text-text-lo">No tenders scraped yet.</p>;
  }

  const maxCount = sources[0].count;

  const visible = sources.slice(0, 6);
  const rest    = sources.length - visible.length;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((src) => (
        <Link
          key={src.name}
          href={`/tenders?type=${encodeURIComponent(src.name)}`}
          className="group flex flex-col gap-1.5 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-surface-2/70"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                style={{ backgroundColor: src.color, boxShadow: `0 0 6px ${src.color}60` }}
              />
              <span className="truncate text-xs text-text-hi group-hover:text-brand-500 transition-colors">
                {src.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs font-bold text-text-hi">{src.count.toLocaleString()}</span>
              <span className="w-8 text-right font-mono text-[10px] text-text-lo">{src.pct}%</span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(src.count / maxCount) * 100}%`, backgroundColor: src.color }}
            />
          </div>
        </Link>
      ))}
      {rest > 0 && (
        <Link
          href="/tenders"
          className="mt-1 rounded-2xl border border-app-border/40 py-2 text-center font-mono text-[11px] text-text-lo transition-colors hover:border-brand-500/30 hover:text-brand-500"
        >
          +{rest} more source{rest !== 1 ? "s" : ""} →
        </Link>
      )}
    </div>
  );
}
