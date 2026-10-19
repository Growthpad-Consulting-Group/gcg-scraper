"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";
import { Icon } from "@iconify/react";
import { cn } from "@/shared/lib/cn";
import GenericTable, { type Column } from "@/shared/ui/GenericTable";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { ActiveFilter, FilterCategoryDef, FilterOption } from "@/shared/ui/UnifiedSearchFilter";
import toast from "react-hot-toast";

const FAVICON_SIZE = 64;

function faviconUrl(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    const host = new URL(sourceUrl).hostname;
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${host}&size=${FAVICON_SIZE}`;
  } catch {
    return null;
  }
}

function TenderLogo({ sourceUrl }: { sourceUrl?: string | null }) {
  const logo = faviconUrl(sourceUrl);
  const [failed, setFailed] = useState(false);
  return (
    <div className="shrink-0 w-7 h-7 rounded-md border border-app-border/50 bg-surface-2 flex items-center justify-center overflow-hidden">
      {logo && !failed ? (
        <img
          src={logo}
          alt=""
          className="w-7 h-7 object-contain"
          onError={() => setFailed(true)}
          onLoad={(e) => { if (e.currentTarget.naturalWidth < FAVICON_SIZE / 2) setFailed(true); }}
        />
      ) : (
        <Icon icon="solar:close-circle-broken" width={13} className="text-text-lo" />
      )}
    </div>
  );
}

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
  country:        "bg-status-info/15 text-status-info",
  keywords:       "bg-status-warning/15 text-status-warning",
  source_content: "bg-status-danger/15 text-status-danger",
};

const ALL_REASONS: RejectionReason[] = ["no_url", "country", "keywords", "source_content"];
const FETCH_LIMIT = 500;

const RECOVER_TOOLTIP: Record<RejectionReason, string> = {
  no_url:         "Promote this tender — no URL to allowlist, so it won't recur automatically",
  country:        "Promote & allowlist — future runs will skip the country filter for this URL",
  keywords:       "Promote & allowlist — future runs will skip the keyword filter for this URL",
  source_content: "Promote & allowlist — future runs will skip the content check for this URL",
};

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

function buildColumns(onRecover: (row: RejectedTender) => void, recoveringId: string | null): Column<RejectedTender>[] {
  return [
    {
      Header: "Title",
      accessor: "title",
      sortable: true,
      width: 420,
      render: (row) => (
        <div className="flex items-start gap-2.5">
          <TenderLogo sourceUrl={row.source_url} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-start gap-2">
              {row.source_url ? (
                <a
                  href={row.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 font-medium text-text-hi underline-offset-2 hover:text-brand-500 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {row.title ?? "(no title)"}
                </a>
              ) : (
                <span className="line-clamp-2 font-medium text-text-hi">
                  {row.title ?? "(no title)"}
                </span>
              )}
              {row.source_url && (
                <a
                  href={row.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 shrink-0 text-text-lo opacity-0 transition-opacity group-hover:opacity-60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon icon="solar:arrow-right-up-broken" width={12} />
                </a>
              )}
            </div>
            {row.location && (
              <p className="text-[11px] text-text-lo">{row.location}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      Header: "Organisation",
      accessor: "organization",
      sortable: true,
      width: 200,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-text-hi">{row.organization ?? "—"}</span>
          {row.category && (
            <p className="text-[11px] text-text-lo">{row.category}</p>
          )}
        </div>
      ),
    },
    {
      Header: "Source",
      accessor: "tender_type",
      sortable: true,
      width: 140,
      render: (row) => (
        <span className="font-mono text-xs text-text-lo">{row.tender_type ?? "—"}</span>
      ),
    },
    {
      Header: "Reason",
      accessor: "reason",
      sortable: true,
      width: 140,
      render: (row) => <ReasonBadge reason={row.reason} />,
    },
    {
      Header: "Date",
      accessor: "rejected_at",
      sortable: true,
      width: 120,
      render: (row) => (
        <span className="font-mono text-xs text-text-lo">{formatDate(row.rejected_at)}</span>
      ),
    },
    {
      Header: "Actions",
      accessor: "id",
      sortable: false,
      width: 90,
      render: (row) => {
        const isRecovering = recoveringId === row.id;
        return (
          <button
            title={RECOVER_TOOLTIP[row.reason]}
            disabled={isRecovering}
            onClick={(e) => { e.stopPropagation(); onRecover(row); }}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
              isRecovering
                ? "cursor-wait border-brand-500/20 bg-brand-500/5 text-brand-500/50"
                : "border-app-border bg-surface text-text-lo hover:border-brand-500/40 hover:bg-brand-500/5 hover:text-brand-500"
            )}
          >
            {isRecovering ? (
              <Icon icon="solar:refresh-broken" width={11} className="animate-spin" />
            ) : (
              <Icon icon="solar:restart-bold" width={11} />
            )}
            Recover
          </button>
        );
      },
    },
  ];
}

function RejectedCandidatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();


  const jobId = searchParams.get("job_id") ?? "";
  const initialReason = (searchParams.get("reason") ?? "") as RejectionReason | "";

  const [allItems, setAllItems] = useState<RejectedTender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reasonFilter, setReasonFilter] = useState<RejectionReason | "">(initialReason);
  const [typeFilter, setTypeFilter] = useState("");
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = new URL("/api/rejected-tenders", window.location.origin);
      if (jobId) url.searchParams.set("job_id", jobId);
      url.searchParams.set("limit", String(FETCH_LIMIT));
      url.searchParams.set("offset", "0");

      const res  = await fetch(url.toString());
      const data = await res.json();
      setAllItems(data.rejected ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRecover = useCallback(async (row: RejectedTender) => {
    setRecoveringId(row.id);
    try {
      const res = await fetch(`/api/rejected-tenders/${row.id}/promote`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to recover tender.");
      } else {
        toast.success("Tender recovered and added to allowlist.");
        setAllItems((prev) => prev.filter((i) => i.id !== row.id));
      }
    } catch {
      toast.error("Network error — could not recover tender.");
    } finally {
      setRecoveringId(null);
    }
  }, []);

  // Client-side filtering on top of the fetched batch
  const filtered = allItems.filter((item) => {
    if (reasonFilter && item.reason !== reasonFilter) return false;
    if (typeFilter && !(item.tender_type ?? "").toLowerCase().includes(typeFilter.toLowerCase())) return false;
    return true;
  });

  const reasonOptions = ALL_REASONS
    .filter((r) => allItems.some((i) => i.reason === r))
    .map((r) => ({ value: r, label: REASON_LABELS[r] }));

  const REJECTED_FILTER_CATEGORIES: FilterCategoryDef[] = [
    { id: 'reason', label: 'Reason', icon: 'solar:danger-triangle-broken' },
  ];

  const rejectedCategoryOptions: Record<string, FilterOption[]> = {
    reason: reasonOptions.map(o => ({ id: o.value, label: o.label, category: 'reason', value: o.value })),
  };

  const rejectedInitialFilters: ActiveFilter[] = reasonFilter
    ? [{ category: 'reason', values: [reasonFilter], label: `Reason: is ${REASON_LABELS[reasonFilter]}`, operator: 'is' }]
    : [];

  const handleRejectedFilterChange = useCallback((filters: ActiveFilter[]) => {
    const r = filters.find(f => f.category === 'reason')?.values[0] ?? '';
    setReasonFilter(r as RejectionReason | '');
  }, []);

  usePageHeader({
    title: "Rejected Candidates",
    description: "Tenders filtered out by rejection rules",
    icon: "solar:close-circle-broken",
    actions: [
      {
        label: "View tenders",
        icon: "solar:case-minimalistic-broken",
        onClick: () => router.push(jobId ? `/tenders?job=${jobId}` : "/tenders"),
      },
    ],
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">

      {/* Job-scoped banner */}
      {jobId && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15">
            <Icon icon="solar:filter-bold" width={12} className="text-amber-400" />
          </div>
          <p className="flex-1 text-sm text-text-hi">
            Filtered to run <span className="font-mono text-amber-400">{jobId.slice(0, 8)}…</span>
          </p>
          <Link
            href="/rejected-candidates"
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-surface px-2.5 py-1 font-mono text-[11px] text-amber-400 transition-colors hover:border-amber-500/40 hover:text-amber-300"
          >
            <Icon icon="solar:close-circle-broken" width={12} />
            Clear filter
          </Link>
        </div>
      )}

      <GenericTable<RejectedTender>
        data={filtered}
        columns={buildColumns(handleRecover, recoveringId)}
        loading={isLoading}
        emptyMessage="No rejected candidates match the current filters."
        searchable
        searchPlaceholder="Search title or organisation…"
        filterCategories={REJECTED_FILTER_CATEGORIES}
        categoryOptions={rejectedCategoryOptions}
        singleSelectCategories={['reason']}
        initialFilters={rejectedInitialFilters}
        onUnifiedFilterChange={handleRejectedFilterChange}
        pageSize={50}
        fullPageHeight
        enableRefresh
        onRefresh={fetchData}
        showExportButton
        exportType="rejected-candidates"
        exportTitle="Rejected Candidates"
        enableStatusPills={false}
        hideActionsColumn
        fixedLayout
        hideEmptyColumns={false}
      />
    </div>
  );
}

export default function RejectedCandidatesPage() {
  return (
    <Suspense fallback={null}>
      <RejectedCandidatesContent />
    </Suspense>
  );
}
