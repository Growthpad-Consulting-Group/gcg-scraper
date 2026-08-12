"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Select from "react-select";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import PageHeader from "@/shared/ui/PageHeader";
import Button from "@/shared/ui/Button";
import RunFilterBanner from "@/shared/ui/RunFilterBanner";
import GenericTable, { type Column, type Action } from "@/shared/ui/GenericTable";
import Badge, { type BadgeStatus } from "@/shared/ui/Badge";
import LogPanel from "@/shared/ui/LogPanel";
import { tenderHref } from "@/shared/lib/slug";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getSelectStyles, getSelectValue } from "@/utils/selectStyles";

const PAGE_SIZE = 500;

// ---------------------------------------------------------------------------
// Tender type
// ---------------------------------------------------------------------------

interface Tender {
  id: string;
  title: string;
  description?: string | null;
  status?: "open" | "closed" | string | null;
  closing_date?: string | null;
  scraped_at?: string | null;
  tender_type?: string | null;
  location?: string | null;
  country?: string | null;
  source_url?: string | null;
  organization?: string | null;
  category?: string | null;
  budget?: number | null;
  currency?: string | null;
  document_url?: string | null;
  raw_content?: string | null;
  format?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tenderStatusBadge(tender: Tender): { label: string; status: BadgeStatus } {
  if (tender.closing_date) {
    const closing = new Date(tender.closing_date);
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (tender.status === "open" && closing >= now && closing <= sevenDays) {
      return { label: "closing soon", status: "warning" };
    }
  }
  if (tender.status === "open") return { label: "open", status: "success" };
  if (tender.status === "closed") return { label: "closed", status: "danger" };
  return { label: tender.status || "unknown", status: "neutral" };
}

/** Returns the best downloadable file URL for this tender, or null. */
function fileLink(tender: Tender): string | null {
  if (tender.document_url) return tender.document_url;
  if (tender.format && tender.format !== "HTML" && tender.source_url) return tender.source_url;
  return null;
}

function fileIcon(format?: string | null): string {
  if (format === "PDF") return "solar:file-text-broken";
  if (format === "DOCX") return "solar:document-broken";
  return "solar:file-download-broken";
}

function formatBudget(budget?: number | null, currency?: string | null): string | null {
  if (budget == null) return null;
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(budget);
  return currency ? `${currency} ${formatted}` : formatted;
}

// ---------------------------------------------------------------------------
// TenderDetail — inline expanded row
// ---------------------------------------------------------------------------

function TenderDetail({ tender }: { tender: Tender }) {
  const [view, setView] = useState<"parsed" | "raw">("parsed");

  return (
    <div className="flex flex-col gap-2 py-3 px-4">
      {/* View toggle */}
      <div className="flex gap-1">
        {(["parsed", "raw"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              view === v
                ? "bg-gcg-orange/10 text-gcg-orange dark:bg-gcg-orange/20 dark:text-blue-300"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "parsed" ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm md:grid-cols-3">
          {([
            ["Organization", tender.organization],
            ["Category", tender.category],
            ["Budget", formatBudget(tender.budget, tender.currency)],
            ["Location", tender.location],
            ["Country", tender.country],
            ["Type", tender.tender_type],
            ["Format", tender.format],
            ["Scraped", tender.scraped_at ? new Date(tender.scraped_at).toLocaleString() : null],
            ["Source URL", tender.source_url],
            ["Document", tender.document_url],
            ["Description", tender.description],
          ] as [string, string | null | undefined][]).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {label}
              </dt>
              {(label === "Source URL" || label === "Document") && value ? (
                <dd className="truncate">
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gcg-orange hover:underline dark:text-blue-400"
                  >
                    {value}
                  </a>
                </dd>
              ) : (
                <dd className="truncate text-gray-800 dark:text-gray-200">{value || "—"}</dd>
              )}
            </div>
          ))}
        </dl>
      ) : (
        <LogPanel
          autoScroll={false}
          lines={[
            {
              text:
                tender.raw_content ||
                "No raw content captured for this tender (scraped before raw capture was added).",
              tone: "default",
            },
          ]}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function buildColumns(
  expandedId: string | null,
  setExpandedId: (id: string | null) => void
): Column<Tender>[] {
  return [
    {
      Header: "Title",
      accessor: "title",
      sortable: true,
      width: 320,
      sticky: true,
      render: (row) => (
        <Link
          href={tenderHref(row)}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-gray-900 hover:underline dark:text-gray-100 line-clamp-2 leading-snug hover:text-gcg-orange dark:hover:text-gcg-orange"
        >
          {row.title}
        </Link>
      ),
    },
    {
      Header: "Status",
      accessor: "status",
      sortable: true,
      render: (row) => {
        const badge = tenderStatusBadge(row);
        return <Badge status={badge.status}>{badge.label}</Badge>;
      },
    },
    {
      Header: "Organization",
      accessor: "organization",
      sortable: true,
      render: (_row, value) =>
        value ? (
          <span className="truncate block max-w-[180px]">{value}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      Header: "Closing",
      accessor: "closing_date",
      sortable: true,
      render: (_row, value) =>
        value ? (
          <span className="font-mono text-xs">{new Date(value).toLocaleDateString()}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      Header: "Doc",
      accessor: "document_url",
      sortable: false,
      headerClassName: "text-center",
      className: "text-center",
      render: (row) => {
        const doc = fileLink(row);
        if (!doc) return <span className="text-gray-300 dark:text-gray-600">—</span>;
        return (
          <a
            href={doc}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gcg-orange/10 hover:text-gcg-orange dark:hover:text-blue-400 transition-colors"
            title={`Open ${row.format || "document"}`}
          >
            <Icon icon={fileIcon(row.format)} className="w-4 h-4" />
          </a>
        );
      },
    },
    {
      Header: "Detail",
      accessor: "id",
      sortable: false,
      headerClassName: "text-center",
      className: "text-center",
      render: (row) => {
        const isExpanded = expandedId === row.id;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedId(isExpanded ? null : row.id);
            }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gcg-orange/10 hover:text-gcg-orange dark:hover:text-blue-400 transition-colors"
            title={isExpanded ? "Collapse" : "Expand detail"}
          >
            <Icon
              icon={isExpanded ? "solar:alt-arrow-up-broken" : "solar:alt-arrow-down-broken"}
              className="w-4 h-4"
            />
          </button>
        );
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// TendersContent
// ---------------------------------------------------------------------------

function TendersContent() {
  const router = useRouter();
  const { resolvedMode: mode } = useTheme();
  const searchParams = useSearchParams();
  const jobFilter = searchParams?.get("job") || null;
  const dateFilter = searchParams?.get("date") || null;
  const typeFilter = searchParams?.get("type") || null;

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [typeFilterValue, setTypeFilterValue] = useState<string | null>(typeFilter);

  // Keep the dropdown in sync if arriving fresh via a ?type= link (e.g. from Overview's Sources
  // list) after the component's already mounted, without fighting the user's own later choice.
  useEffect(() => {
    setTypeFilterValue(typeFilter);
  }, [typeFilter]);

  const fetchTenders = useCallback(async () => {
    setIsLoading(true);
    try {
      const jobParam = jobFilter ? `&job=${jobFilter}` : "";
      const res = await fetch(`/api/tenders?limit=${PAGE_SIZE}&offset=0${jobParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tenders");
      setTenders(data.tenders || []);
      setTotal(data.total ?? (data.tenders || []).length);
    } catch (err: any) {
      toast.error("Error fetching tenders: " + err.message);
      setTenders([]);
    } finally {
      setIsLoading(false);
    }
  }, [jobFilter]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const jobParam = jobFilter ? `&job=${jobFilter}` : "";
      const res = await fetch(`/api/tenders?limit=${PAGE_SIZE}&offset=${tenders.length}${jobParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tenders");
      setTenders((prev) => [...prev, ...(data.tenders || [])]);
    } catch (err: any) {
      toast.error("Error loading more tenders: " + err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [tenders.length, jobFilter]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  const handleDeleteTender = async (tender: Tender) => {
    const loadingToastId = toast.loading("Deleting tender...");
    try {
      setTenders((prev) => prev.filter((t) => t.id !== tender.id));
      const res = await fetch(`/api/tenders/${tender.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete tender");
      toast.success("Tender deleted successfully!", { id: loadingToastId });
    } catch (err: any) {
      await fetchTenders();
      toast.error("Failed to delete tender. Please try again.", { id: loadingToastId });
    }
  };

  // Matches the local-day bucketing TendersTrendChart uses on Overview, so clicking a bar and
  // landing here shows exactly the tenders that bar counted.
  const dateFilteredTenders = dateFilter
    ? tenders.filter((t) => {
        if (!t.scraped_at) return false;
        const [y, m, d] = dateFilter.split("-").map(Number);
        return new Date(t.scraped_at).toDateString() === new Date(y, m - 1, d).toDateString();
      })
    : tenders;

  // Cascading facets: each sidebar dropdown's options come from tenders matching every *other*
  // active facet (not itself), so e.g. picking a Country narrows which Categories are even
  // possible instead of always listing every value across the whole dataset — picking Kenya then
  // seeing a Category with zero Kenyan tenders would otherwise silently dead-end the user.
  type FacetKey = "type" | "country" | "category" | "status";
  const applyFacets = useCallback(
    (skip: FacetKey | null) => {
      let list = dateFilteredTenders;
      if (skip !== "type" && typeFilterValue) list = list.filter((t) => t.tender_type === typeFilterValue);
      if (skip !== "country" && countryFilter) list = list.filter((t) => t.country === countryFilter);
      if (skip !== "category" && categoryFilter) list = list.filter((t) => t.category === categoryFilter);
      if (skip !== "status" && statusFilter) list = list.filter((t) => t.status === statusFilter);
      return list;
    },
    [dateFilteredTenders, typeFilterValue, countryFilter, categoryFilter, statusFilter]
  );

  // Normalized `country` (see countries.ts:normalizeCountry), not the raw free-text `location` —
  // "Nairobi, Kenya" and "Kenya" both filter as one "Kenya" instead of two near-duplicate options.
  const countryOptions = useMemo(
    () => [...new Set(applyFacets("country").map((t) => t.country).filter((v): v is string => !!v?.trim()))].sort(),
    [applyFacets]
  );
  const typeOptions = useMemo(
    () => [...new Set(applyFacets("type").map((t) => t.tender_type).filter((v): v is string => !!v?.trim()))].sort(),
    [applyFacets]
  );
  const categoryOptions = useMemo(
    () => [...new Set(applyFacets("category").map((t) => t.category).filter((v): v is string => !!v?.trim()))].sort(),
    [applyFacets]
  );
  const statusOptionValues = useMemo(
    () => new Set(applyFacets("status").map((t) => t.status)),
    [applyFacets]
  );
  const filteredTenders = applyFacets(null);

  const activeFilterCount = [typeFilterValue, countryFilter, categoryFilter, statusFilter].filter(Boolean).length;
  const clearAllFilters = () => {
    setTypeFilterValue(null);
    setCountryFilter(null);
    setCategoryFilter(null);
    setStatusFilter(null);
    if (typeFilter) router.push("/tenders");
  };

  const columns = buildColumns(expandedId, setExpandedId);

  const actions: Action<Tender>[] = [
    {
      icon: "solar:eye-broken",
      tooltip: "Open tender detail",
      label: "View",
      onClick: (row) => {
        window.open(tenderHref(row), "_self");
      },
    },
  ];

  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ];

  /**
   * customRowRender lets us inject the expand panel after each row
   * without breaking GenericTable's row rendering.
   */
  const customRowRender = (row: Tender, _index: number, defaultRow: React.ReactNode) => (
    <Fragment key={row.id}>
      {defaultRow}
      {expandedId === row.id && (
        <tr className="bg-gray-50/80 dark:bg-gray-800/40">
          <td
            colSpan={columns.length + 2} // +2 for checkbox + actions cols
            className="border-b border-slate-100 dark:border-slate-800/60 p-0"
          >
            <TenderDetail tender={row} />
          </td>
        </tr>
      )}
    </Fragment>
  );

  return (
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Tenders"
          description="All tenders collected so far — click into any one to see which run found it."
          icon="solar:case-minimalistic-broken"
          actions={[
            {
              label: "Add Source",
              icon: "solar:upload-broken",
              onClick: () => router.push("/website-sources"),
            },
          ]}
        />

        {jobFilter && (
          <RunFilterBanner
            jobId={jobFilter}
            onClear={() => router.push("/tenders")}
            resultsNoun="tenders"
          />
        )}

        {dateFilter && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-app-border bg-surface px-3 py-2 text-sm">
            <Badge status="info">Filtered</Badge>
            <span className="text-text-hi">
              Tenders scraped on{" "}
              {new Date(`${dateFilter}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </span>
            <span className="font-mono text-[11px] text-text-lo">{filteredTenders.length} tenders</span>
            <button onClick={() => router.push("/tenders")} className="ml-auto flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-brand-500 hover:underline">
              <Icon icon="mdi:close" width={12} />
              Clear filter
            </button>
          </div>
        )}

        {/* `main` in AppShell has overflow-hidden, which silently breaks position:sticky for any
            descendant bound to it as the containing scroll block (a well-known CSS gotcha: sticky
            needs its nearest overflow!=visible ancestor to be the thing that actually scrolls).
            Giving this grid its own bounded height + overflow-y-auto makes it the real scrolling
            container instead, so the sidebar can stick within it — scoped to this page only,
            without touching the shared AppShell layout every other page also renders through.
            GenericTable's own fullPageHeight scroll region is turned off below so there's only
            one scroll owner here instead of two competing height budgets clipping each other. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:h-[calc(100vh-var(--header-height)-32px)] lg:items-start lg:overflow-y-auto">
          {sidebarOpen && (
            <aside className="flex h-fit flex-col gap-4 rounded-lg border border-app-border bg-surface p-4 lg:sticky lg:top-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium uppercase tracking-wide text-text-lo">Filters</span>
                <button onClick={() => setSidebarOpen(false)} className="text-text-lo hover:text-text-hi" aria-label="Hide filters">
                  <Icon icon="mdi:close" width={16} />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-lo">Status</label>
                <Select
                  value={statusFilter ? { value: statusFilter, label: statusFilter === "open" ? "Open" : "Closed" } : null}
                  onChange={(opt) => setStatusFilter((getSelectValue(opt) as "open" | "closed" | null) || null)}
                  options={[
                    { value: "open", label: "Open" },
                    { value: "closed", label: "Closed" },
                  ].filter((o) => statusOptionValues.has(o.value))}
                  placeholder="All statuses"
                  isClearable
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={getSelectStyles<{ value: string; label: string }>(mode)}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-lo">Source</label>
                <Select
                  value={typeFilterValue ? { value: typeFilterValue, label: typeFilterValue } : null}
                  onChange={(opt) => setTypeFilterValue(getSelectValue(opt) || null)}
                  options={typeOptions.map((t) => ({ value: t, label: t }))}
                  placeholder="All sources"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "No sources found"}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={getSelectStyles<{ value: string; label: string }>(mode)}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-lo">Country</label>
                <Select
                  value={countryFilter ? { value: countryFilter, label: countryFilter } : null}
                  onChange={(opt) => setCountryFilter(getSelectValue(opt) || null)}
                  options={countryOptions.map((c) => ({ value: c, label: c }))}
                  placeholder="All countries"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "No countries found"}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={getSelectStyles<{ value: string; label: string }>(mode)}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-lo">Category</label>
                <Select
                  value={categoryFilter ? { value: categoryFilter, label: categoryFilter } : null}
                  onChange={(opt) => setCategoryFilter(getSelectValue(opt) || null)}
                  options={categoryOptions.map((c) => ({ value: c, label: c }))}
                  placeholder="All categories"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "No categories found"}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={getSelectStyles<{ value: string; label: string }>(mode)}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                />
              </div>

              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-brand-500 hover:underline">
                  <Icon icon="mdi:close" width={12} />
                  Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
                </button>
              )}
            </aside>
          )}

          <div className="flex flex-col gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex w-fit items-center gap-1.5 rounded-md border border-app-border bg-surface px-3 py-1.5 text-sm text-text-hi hover:border-text-lo"
              >
                <Icon icon="solar:filter-broken" width={14} />
                Show filters
                {activeFilterCount > 0 && <Badge status="info">{activeFilterCount}</Badge>}
              </button>
            )}

            <GenericTable<Tender>
              data={filteredTenders}
              columns={columns}
              loading={isLoading}
              title="Tenders"
              emptyMessage="No tenders found. Run a scrape job to populate results."
              selectable
              searchable
              searchPlaceholder="Search tenders…"
              enableDateFilter
              enableStatusPills={false} // we handle status rendering ourselves via Badge
              statusOptions={statusOptions}
              showExportButton
              exportType="tenders"
              exportTitle="Tenders"
              actions={actions}
              onDelete={handleDeleteTender}
              confirmDelete
              deleteConfirmationProps={{
                itemType: "tender",
                message: (item) => `"${item?.title || "this tender"}"`,
                suppressToast: false,
              }}
              customRowRender={customRowRender}
              hideEmptyColumns={false}
              fullPageHeight={false}
              stickyHeader
              stickyTopOffset={0}
              enableRefresh
              onRefresh={fetchTenders}
              showBulkBar
              getRowClassName={(row) =>
                expandedId === row.id ? "bg-blue-50/30 dark:bg-gcg-orange/5" : ""
              }
            />
          </div>
        </div>

        {!isLoading && tenders.length < total && (
          <Button
            size="sm"
            variant="secondary"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="self-center"
          >
            <Icon
              icon={isLoadingMore ? "mdi:loading" : "mdi:chevron-down"}
              width={16}
              className={isLoadingMore ? "animate-spin" : ""}
            />
            Load more ({tenders.length} of {total})
          </Button>
        )}
      </div>
  );
}

export default function TendersPage() {
  return (
    <Suspense fallback={null}>
      <TendersContent />
    </Suspense>
  );
}
