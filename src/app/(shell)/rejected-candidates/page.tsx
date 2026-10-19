"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";
import { Icon } from "@iconify/react";
import { cn } from "@/shared/lib/cn";
import GenericTable, { type Column } from "@/shared/ui/GenericTable";
import Select from "react-select";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getSelectStyles, getSelectValue } from "@/utils/selectStyles";

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

function buildColumns(): Column<RejectedTender>[] {
  return [
    {
      Header: "Title",
      accessor: "title",
      sortable: true,
      width: 420,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
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
  ];
}

function RejectedCandidatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedMode: mode } = useTheme();

  const jobId = searchParams.get("job_id") ?? "";
  const initialReason = (searchParams.get("reason") ?? "") as RejectionReason | "";

  const [allItems, setAllItems] = useState<RejectedTender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reasonFilter, setReasonFilter] = useState<RejectionReason | "">(initialReason);
  const [typeFilter, setTypeFilter] = useState("");

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

  // Client-side filtering on top of the fetched batch
  const filtered = allItems.filter((item) => {
    if (reasonFilter && item.reason !== reasonFilter) return false;
    if (typeFilter && !(item.tender_type ?? "").toLowerCase().includes(typeFilter.toLowerCase())) return false;
    return true;
  });

  const reasonOptions = ALL_REASONS
    .filter((r) => allItems.some((i) => i.reason === r))
    .map((r) => ({ value: r, label: REASON_LABELS[r] }));

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

  const activeFilterCount = [reasonFilter, typeFilter].filter(Boolean).length;

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

      {/* Extra filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Select
            value={reasonFilter ? { value: reasonFilter, label: REASON_LABELS[reasonFilter] } : null}
            onChange={(opt) => setReasonFilter((getSelectValue(opt) as RejectionReason | null) ?? "")}
            options={reasonOptions}
            placeholder="All reasons"
            isClearable
            className="react-select-container"
            classNamePrefix="react-select"
            styles={getSelectStyles<{ value: string; label: string }>(mode)}
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
          />
        </div>

        <input
          type="text"
          placeholder="Filter by source…"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-44 rounded-lg border border-app-border bg-surface px-3 py-2 text-sm text-text-hi placeholder:text-text-lo focus:border-brand-500 focus:outline-none"
        />

        {activeFilterCount > 0 && (
          <button
            onClick={() => { setReasonFilter(""); setTypeFilter(""); }}
            className="flex items-center gap-1.5 rounded-lg border border-app-border bg-surface px-2.5 py-2 text-xs text-text-lo transition-colors hover:border-brand-500/30 hover:text-brand-500"
          >
            <Icon icon="solar:close-circle-broken" width={13} />
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <GenericTable<RejectedTender>
        data={filtered}
        columns={buildColumns()}
        loading={isLoading}
        title="Rejected Candidates"
        emptyMessage="No rejected candidates match the current filters."
        searchable
        searchPlaceholder="Search title or organisation…"
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
