"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface RejectedBucket {
  reason: string;
  count: number;
}

const REASON_LABEL: Record<string, string> = {
  no_url:         "No URL",
  country:        "Country filter",
  keywords:       "Keyword filter",
  source_content: "Source content",
};

const REASON_ICON: Record<string, string> = {
  no_url:         "solar:link-broken",
  country:        "solar:global-broken",
  keywords:       "solar:tag-broken",
  source_content: "solar:document-broken",
};

const REASON_COLOR: Record<string, string> = {
  no_url:         "#71717a",
  country:        "#3b82f6",
  keywords:       "#eab308",
  source_content: "#ef4444",
};

const ALL_REASONS = ["no_url", "country", "keywords", "source_content"];

export default function RejectedSummary() {
  const [buckets, setBuckets] = useState<RejectedBucket[]>([]);
  const [total, setTotal]     = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch counts per reason in parallel
        const results = await Promise.all(
          ALL_REASONS.map(async (r) => {
            const res  = await fetch(`/api/rejected-tenders?reason=${r}&limit=1`);
            const data = await res.json();
            return { reason: r, count: data.total ?? 0 };
          })
        );
        setBuckets(results.filter((b) => b.count > 0));
        setTotal(results.reduce((s, b) => s + b.count, 0));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxCount = buckets.reduce((m, b) => Math.max(m, b.count), 1);

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
              <div className="h-8 w-8 animate-pulse rounded-2xl bg-surface-2" />
              <div className="flex-1">
                <div className="h-3 w-24 animate-pulse rounded-lg bg-surface-2" />
                <div className="mt-1.5 h-1.5 w-full animate-pulse rounded-full bg-surface-2" />
              </div>
              <div className="h-3 w-8 animate-pulse rounded-lg bg-surface-2" />
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/20">
            <Icon icon="solar:check-circle-broken" width={22} className="text-white" />
          </div>
          <p className="text-xs font-semibold text-text-hi">All clear</p>
          <p className="text-xs text-text-lo">No candidates rejected yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {buckets.map((b) => (
              <Link
                key={b.reason}
                href={`/rejected-candidates?reason=${b.reason}`}
                className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-surface-2/70"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${REASON_COLOR[b.reason]}30, ${REASON_COLOR[b.reason]}15)`, border: `1px solid ${REASON_COLOR[b.reason]}30` }}
                >
                  <Icon
                    icon={REASON_ICON[b.reason] ?? "solar:close-circle-broken"}
                    width={14}
                    style={{ color: REASON_COLOR[b.reason] }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-hi transition-colors group-hover:text-brand-500">
                      {REASON_LABEL[b.reason] ?? b.reason}
                    </span>
                    <span className="font-mono text-xs font-bold" style={{ color: REASON_COLOR[b.reason] }}>
                      {b.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(b.count / maxCount) * 100}%`, backgroundColor: REASON_COLOR[b.reason] }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Link
            href="/rejected-candidates"
            className="flex items-center justify-between rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-amber-400/5 px-4 py-2.5 transition-all duration-200 hover:border-amber-500/40 hover:from-amber-500/15"
          >
            <span className="font-mono text-[11px] font-bold text-amber-400">
              {total?.toLocaleString()} total rejected
            </span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-400">
              View all
              <Icon icon="solar:arrow-right-broken" width={12} />
            </div>
          </Link>
        </>
      )}
    </div>
  );
}
