"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";
import { Icon } from "@iconify/react";
import { cn } from "@/shared/lib/cn";
import Button from "@/shared/ui/Button";

type RejectionReason = "no_url" | "country" | "keywords" | "source_content";

interface RejectedTender {
  id: string;
  job_id: string;
  tender_type: string | null;
  title: string | null;
  source_url: string | null;
  organization: string | null;
  category: string | null;
  location: string | null;
  reason: RejectionReason;
  rejected_at: string;
}

const REASON_LABELS: Record<RejectionReason, string> = {
  no_url:         "No URL",
  country:        "Country filter",
  keywords:       "Keyword filter",
  source_content: "Source content",
};

const REASON_COLORS: Record<RejectionReason, string> = {
  no_url:         "bg-zinc-500/15 text-zinc-400",
  country:        "bg-blue-500/15 text-blue-400",
  keywords:       "bg-amber-500/15 text-amber-400",
  source_content: "bg-red-500/15 text-red-400",
};

const ALL_REASONS: RejectionReason[] = ["no_url", "country", "keywords", "source_content"];
const PAGE_SIZE = 50;

function ReasonBadge({ reason }: { reason: RejectionReason }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold", REASON_COLORS[reason])}>
      {REASON_LABELS[reason]}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function RejectedCandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<RejectedTender[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch]       = useState(searchParams.get("q") ?? "");
  const [reason, setReason]       = useState(searchParams.get("reason") ?? "");
  const [tenderType, setTenderType] = useState(searchParams.get("tender_type") ?? "");
  const [jobId]                   = useState(searchParams.get("job_id") ?? "");
  const [offset, setOffset]       = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (params: {
    q: string; reason: string; tenderType: string; offset: number;
  }) => {
    setIsLoading(true);
    try {
      const url = new URL("/api/rejected-tenders", window.location.origin);
      if (params.q)          url.searchParams.set("q", params.q);
      if (params.reason)     url.searchParams.set("reason", params.reason);
      if (params.tenderType) url.searchParams.set("tender_type", params.tenderType);
      if (jobId)             url.searchParams.set("job_id", jobId);
      url.searchParams.set("limit",  String(PAGE_SIZE));
      url.searchParams.set("offset", String(params.offset));

      const res  = await fetch(url.toString());
      const data = await res.json();
      setItems(data.rejected ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync URL params and fetch on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const newOffset = 0;
      setOffset(newOffset);
      fetchData({ q: search, reason, tenderType, offset: newOffset });
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, reason, tenderType]);

  useEffect(() => {
    fetchData({ q: search, reason, tenderType, offset });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const totalPages   = Math.ceil(total / PAGE_SIZE);
  const currentPage  = Math.floor(offset / PAGE_SIZE) + 1;

  usePageHeader({
    title: "Rejected Candidates",
    description: "Tenders filtered out by rejection rules",
    icon: "solar:close-circle-broken",
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
              <Icon icon="solar:danger-triangle-broken" width={16} className="text-amber-400" />
            </div>
            <h1 className="text-lg font-semibold text-text-hi">Rejected Candidates</h1>
          </div>
          <p className="mt-1 text-sm text-text-lo">
            Tenders filtered out during scrape runs — inspect why candidates were rejected.
          </p>
        </div>
        <Link href="/run-query">
          <Button size="md">
            <Icon icon="solar:play-circle-broken" width={16} />
            New Run
          </Button>
        </Link>
      </div>

      {/* Job-scoped banner */}
      {jobId && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
          <Icon icon="solar:filter-broken" width={15} className="shrink-0 text-amber-400" />
          <p className="flex-1 text-sm text-text-hi">
            Filtered to run <span className="font-mono text-amber-400">{jobId.slice(0, 8)}…</span>
          </p>
          <Link
            href="/rejected-candidates"
            className="flex items-center gap-1 font-mono text-[11px] text-amber-400 transition-colors hover:text-amber-300"
          >
            Clear filter
            <Icon icon="solar:close-circle-broken" width={12} />
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon
            icon="solar:magnifier-broken"
            width={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-lo"
          />
          <input
            type="text"
            placeholder="Search title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-app-border bg-surface py-2 pl-8 pr-3 text-sm text-text-hi placeholder:text-text-lo focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Reason filter */}
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-lg border border-app-border bg-surface px-3 py-2 text-sm text-text-hi focus:border-brand-500 focus:outline-none"
        >
          <option value="">All reasons</option>
          {ALL_REASONS.map((r) => (
            <option key={r} value={r}>{REASON_LABELS[r]}</option>
          ))}
        </select>

        {/* Tender type filter */}
        <input
          type="text"
          placeholder="Source type…"
          value={tenderType}
          onChange={(e) => setTenderType(e.target.value)}
          className="w-36 rounded-lg border border-app-border bg-surface px-3 py-2 text-sm text-text-hi placeholder:text-text-lo focus:border-brand-500 focus:outline-none"
        />

        {/* Clear */}
        {(search || reason || tenderType) && (
          <button
            onClick={() => { setSearch(""); setReason(""); setTenderType(""); }}
            className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-text-lo transition-colors hover:text-text-hi"
          >
            <Icon icon="solar:close-circle-broken" width={14} />
            Clear
          </button>
        )}

        <span className="ml-auto font-mono text-[11px] text-text-lo">
          {isLoading ? "…" : `${total.toLocaleString()} records`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-app-border/50">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-text-lo/60">Title</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-text-lo/60">Organisation</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-text-lo/60">Type</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-text-lo/60">Reason</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-text-lo/60">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-app-border/30">
                    <td className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-surface-2" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-surface-2" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-surface-2" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Icon icon="solar:check-circle-broken" width={28} className="text-status-success/60" />
                      <p className="text-sm text-text-lo">No rejected candidates match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="group border-b border-app-border/30 transition-colors hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        {item.source_url ? (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="line-clamp-2 max-w-[340px] font-medium text-text-hi underline-offset-2 hover:underline"
                          >
                            {item.title ?? "(no title)"}
                          </a>
                        ) : (
                          <span className="line-clamp-2 max-w-[340px] font-medium text-text-hi">
                            {item.title ?? "(no title)"}
                          </span>
                        )}
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                          >
                            <Icon icon="solar:arrow-right-up-broken" width={12} className="text-text-lo" />
                          </a>
                        )}
                      </div>
                      {item.location && (
                        <p className="mt-0.5 text-[11px] text-text-lo">{item.location}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-text-hi">{item.organization ?? "—"}</span>
                      {item.category && (
                        <p className="mt-0.5 text-[11px] text-text-lo">{item.category}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-text-lo">{item.tender_type ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ReasonBadge reason={item.reason} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-text-lo">{formatDate(item.rejected_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-app-border/50 px-4 py-3">
            <span className="font-mono text-[11px] text-text-lo">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 disabled:opacity-30"
              >
                <Icon icon="solar:arrow-left-broken" width={14} className="text-text-lo" />
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 disabled:opacity-30"
              >
                <Icon icon="solar:arrow-right-broken" width={14} className="text-text-lo" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
