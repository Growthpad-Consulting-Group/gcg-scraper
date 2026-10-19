"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";
import Button from "@/shared/ui/Button";
import RunFilterBanner from "@/shared/ui/RunFilterBanner";
import GenericTable, { type Column, type Action } from "@/shared/ui/GenericTable";
import StatCard from "@/shared/ui/StatCard";
import type { ActiveFilter, FilterCategoryDef, FilterOption } from "@/shared/ui/UnifiedSearchFilter";
import Badge, { type BadgeStatus } from "@/shared/ui/Badge";
import LogPanel from "@/shared/ui/LogPanel";
import { tenderHref } from "@/shared/lib/slug";
import PursuitPanel, { PURSUIT_OPTIONS, type PursuitFields } from "@/features/tenders/components/PursuitPanel";
import AddTenderModal from "@/features/tenders/components/AddTenderModal";
import { useTheme } from "@/shared/contexts/ThemeContext";

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
  matched_keywords?: string[] | null;
  budget?: number | null;
  currency?: string | null;
  document_url?: string | null;
  raw_content?: string | null;
  format?: string | null;
  pursuit_status?: string | null;
  assigned_to?: string | null;
  pursuit_notes?: string | null;
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

/** "HTML" is an internal fallback meaning "no downloadable file was detected, this is just a
 * webpage" (see fileLink) — not a label a non-technical user would find meaningful next to "PDF"
 * or "DOCX", so it's shown as "Web" instead. */
function formatLabel(format?: string | null): string | null {
  if (!format) return null;
  return format === "HTML" ? "Web" : format;
}

function formatBudget(budget?: number | null, currency?: string | null): string | null {
  if (budget == null) return null;
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(budget);
  return currency ? `${currency} ${formatted}` : formatted;
}

/** "Posted" as consistent relative time across all dates — gives freshness signal uniformly
 * rather than switching to absolute dates for older tenders. */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

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

/** Falls back to a generic case icon when there's no source_url to derive a favicon from, when the
 * image fails outright, or when Google's faviconV2 service silently substitutes its own generic
 * globe/document placeholder instead of erroring (its documented `fallback_opts` behavior for a
 * domain with no real favicon) — that placeholder loads at a fixed intrinsic size well under the
 * `size` we requested, so a naturalWidth far short of that is a reliable "no real favicon" signal,
 * unlike an actual favicon which is served scaled up to match. */
function TenderLogo({ sourceUrl }: { sourceUrl?: string | null }) {
  const logo = faviconUrl(sourceUrl);
  const imgRef = useRef<HTMLImageElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  const showFallback = () => {
    if (imgRef.current) imgRef.current.style.display = "none";
    if (fallbackRef.current) fallbackRef.current.style.display = "flex";
  };

  return (
    <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
      {logo ? (
        <>
          <img
            ref={imgRef}
            src={logo}
            alt=""
            className="w-10 h-10 object-contain"
            onError={showFallback}
            onLoad={(e) => { if (e.currentTarget.naturalWidth < FAVICON_SIZE / 2) showFallback(); }}
          />
          <div ref={fallbackRef} style={{ display: "none" }} className="w-12 h-12 items-center justify-center">
            <Icon icon="solar:case-minimalistic-broken" width={24} className="text-text-lo" />
          </div>
        </>
      ) : (
        <Icon icon="solar:case-minimalistic-broken" width={24} className="text-text-lo" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column definitions with card-like rendering
// ---------------------------------------------------------------------------

const PURSUIT_BADGE: Record<string, { label: string; status: BadgeStatus }> = {
  watching:  { label: "Watching",  status: "info" },
  preparing: { label: "Preparing", status: "warning" },
  applied:   { label: "Applied",   status: "neutral" },
  won:       { label: "Won",       status: "success" },
  lost:      { label: "Lost",      status: "danger" },
  skipped:   { label: "Skipped",   status: "neutral" },
};

const NO_DEADLINE_SENTINEL = "9999-12-31";

function deadlineDisplay(row: Tender): { dateStr: string | null; daysLeft: number | null; urgent: boolean } {
  if (!row.closing_date || row.closing_date === NO_DEADLINE_SENTINEL) return { dateStr: null, daysLeft: null, urgent: false };
  const deadline = new Date(row.closing_date);
  if (isNaN(deadline.getTime())) return { dateStr: null, daysLeft: null, urgent: false };
  const dateStr = deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (row.status !== "open") return { dateStr, daysLeft: null, urgent: false };
  const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { dateStr, daysLeft: null, urgent: false };
  return { dateStr, daysLeft: days, urgent: days <= 7 };
}

function buildColumns(
  expandedId: string | null,
  setExpandedId: (id: string | null) => void
): Column<Tender>[] {
  return [
    {
      Header: "Tender",
      accessor: "title",
      sortable: true,
      width: 440,
      render: (row) => (
        <div className="flex items-start gap-3">
          <TenderLogo sourceUrl={row.source_url} />
          <div className="flex-1 min-w-0">
            <Link
              href={tenderHref(row)}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-text-hi hover:text-brand-500 line-clamp-2 text-sm leading-snug"
            >
              {row.title}
            </Link>
            <div className="mt-1 space-y-0.5 text-xs text-text-lo">
              {row.organization && (
                <div className="truncate"><span className="text-text-hi font-medium">{row.organization}</span></div>
              )}
              {row.category && (
                <div className="truncate">{row.category}</div>
              )}
              {row.scraped_at && (
                <div>Posted {formatRelativeTime(row.scraped_at)}</div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      Header: "Deadline",
      accessor: "closing_date",
      sortable: true,
      width: 160,
      render: (row) => {
        const { dateStr, daysLeft, urgent } = deadlineDisplay(row);
        const badge = tenderStatusBadge(row);
        return (
          <div className="space-y-1.5 text-xs">
            <Badge status={badge.status}>{badge.label}</Badge>
            {dateStr ? (
              <div className="space-y-0.5">
                <div className="font-medium text-text-hi">{dateStr}</div>
                {daysLeft !== null && (
                  <div className={urgent ? "font-semibold text-status-warning" : "text-text-lo"}>
                    {daysLeft === 0 ? "closes today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-text-lo">No deadline</div>
            )}
          </div>
        );
      },
    },
    {
      Header: "Location / Budget",
      accessor: "location",
      sortable: true,
      width: 180,
      render: (row) => (
        <div className="space-y-1 text-xs">
          {row.location ? (
            <div className="flex items-start gap-1">
              <Icon icon="solar:map-point-broken" width={12} className="mt-0.5 shrink-0 text-text-lo" />
              <span className="text-sm font-medium capitalize line-clamp-2">{row.location}</span>
            </div>
          ) : (
            <span className="text-text-lo">—</span>
          )}
          {formatBudget(row.budget, row.currency) && (
            <div className="flex items-center gap-1 text-text-lo">
              <Icon icon="solar:dollar-minimalistic-broken" width={12} className="shrink-0" />
              <span className="text-text-hi font-medium">{formatBudget(row.budget, row.currency)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      Header: "Source",
      accessor: "tender_type",
      sortable: true,
      width: 160,
      render: (row) => (
        <div className="space-y-1.5 text-xs">
          {row.tender_type && (
            <div className="font-medium text-sm">{row.tender_type}</div>
          )}
          {row.matched_keywords && (row.matched_keywords as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(row.matched_keywords as string[]).slice(0, 3).map((kw) => (
                <span key={kw} className="rounded bg-brand-500/10 px-1.5 py-0.5 font-mono text-[10px] text-brand-500">
                  {kw}
                </span>
              ))}
              {(row.matched_keywords as string[]).length > 3 && (
                <span className="text-[10px] text-text-lo">+{(row.matched_keywords as string[]).length - 3}</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      Header: "Pursuit",
      accessor: "pursuit_status",
      sortable: true,
      width: 120,
      render: (row) => {
        const ps = row.pursuit_status as string | null;
        if (!ps) return <span className="text-xs text-text-lo">—</span>;
        const b = PURSUIT_BADGE[ps] ?? { label: ps, status: "neutral" as BadgeStatus };
        return (
          <div className="space-y-1 text-xs">
            <Badge status={b.status}>{b.label}</Badge>
            {row.assigned_to && (
              <div className="truncate text-[11px] text-text-lo">{row.assigned_to as string}</div>
            )}
          </div>
        );
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// TenderDetail — inline expanded row
// ---------------------------------------------------------------------------

function TenderDetail({
  tender,
  isLoadingRaw,
  onPursuitSaved,
}: {
  tender: Tender;
  isLoadingRaw: boolean;
  onPursuitSaved: (fields: PursuitFields) => void;
}) {
  const [view, setView] = useState<"parsed" | "raw">("parsed");

  return (
    <div className="flex flex-col gap-3 py-3 px-4">
      <div className="rounded-xl border border-app-border bg-surface-2 p-3">
        <PursuitPanel
          tenderId={tender.id}
          compact
          initial={{
            pursuit_status: tender.pursuit_status ?? null,
            assigned_to: tender.assigned_to ?? null,
            pursuit_notes: tender.pursuit_notes ?? null,
            bid_submitted_at: (tender.bid_submitted_at as string | null) ?? null,
            bid_value: (tender.bid_value as number | null) ?? null,
          }}
          onSaved={onPursuitSaved}
        />
      </div>

      {/* View toggle */}
      <div className="flex gap-1">
        {(["parsed", "raw"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              view === v
                ? "bg-brand-500/10 text-brand-500"
                : "text-text-lo hover:text-text-hi"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "parsed" ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-app-border bg-surface-2 p-4 text-sm md:grid-cols-3">
          {([
            ["Organization", tender.organization],
            ["Category", tender.category],
            ["Matched keywords", tender.matched_keywords?.length ? tender.matched_keywords.join(", ") : null],
            ["Budget", formatBudget(tender.budget, tender.currency)],
            ["Location", tender.location],
            ["Country", tender.country],
            ["Type", tender.tender_type],
            ["Format", formatLabel(tender.format)],
            ["Scraped", tender.scraped_at ? new Date(tender.scraped_at).toLocaleString() : null],
            ["Source URL", tender.source_url],
            ["Document", tender.document_url],
            ["Description", tender.description],
          ] as [string, string | null | undefined][]).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-text-lo">
                {label}
              </dt>
              {(label === "Source URL" || label === "Document") && value ? (
                <dd className="truncate">
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-500 hover:underline"
                  >
                    {value}
                  </a>
                </dd>
              ) : (
                <dd className="truncate text-text-hi">{value || "—"}</dd>
              )}
            </div>
          ))}
        </dl>
      ) : isLoadingRaw ? (
        <div className="rounded-xl border border-app-border bg-surface-2 p-4 text-sm text-text-lo">
          Loading raw content…
        </div>
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
// TendersContent
// ---------------------------------------------------------------------------

function TendersContent() {
  const router = useRouter();
  const { resolvedMode: mode } = useTheme();
  const searchParams = useSearchParams();
  const jobFilter = searchParams?.get("job") || null;
  const dateFilter = searchParams?.get("date") || null;
  const typeFilter = searchParams?.get("type") || null;
  const dateFromParam = searchParams?.get("dateFrom") || null;
  const dateToParam   = searchParams?.get("dateTo")   || null;
  const sourceFilter = searchParams?.get("source") || null;
  const sourceLabel = searchParams?.get("sourceLabel") || sourceFilter;

  const [addTenderOpen, setAddTenderOpen] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingRawContentId, setLoadingRawContentId] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "closing_soon" | null>(null);
  const pursuitParam = searchParams?.get("pursuit") || null;
  const [pursuitFilter, setPursuitFilter] = useState<string | null>(pursuitParam);
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
      const sourceParam = sourceFilter ? `&source=${encodeURIComponent(sourceFilter)}` : "";
      const res = await fetch(`/api/tenders?limit=${PAGE_SIZE}&offset=0${jobParam}${sourceParam}`);
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
  }, [jobFilter, sourceFilter]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const jobParam = jobFilter ? `&job=${jobFilter}` : "";
      const sourceParam = sourceFilter ? `&source=${encodeURIComponent(sourceFilter)}` : "";
      const res = await fetch(`/api/tenders?limit=${PAGE_SIZE}&offset=${tenders.length}${jobParam}${sourceParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tenders");
      setTenders((prev) => [...prev, ...(data.tenders || [])]);
    } catch (err: any) {
      toast.error("Error loading more tenders: " + err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [tenders.length, jobFilter, sourceFilter]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  // raw_content is deliberately excluded from the list fetch (api/tenders/route.ts) — it's a full
  // scraped-page markdown dump only ever shown for the one row currently expanded, so it's fetched
  // on demand here instead of downloaded for all 500 rows on every page load.
  useEffect(() => {
    if (!expandedId) return;
    const row = tenders.find((t) => t.id === expandedId);
    if (!row || row.raw_content !== undefined) return;

    setLoadingRawContentId(expandedId);
    fetch(`/api/tenders/${expandedId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.tender) return;
        setTenders((prev) => prev.map((t) => (t.id === expandedId ? { ...t, raw_content: data.tender.raw_content ?? null } : t)));
      })
      .catch(() => {})
      .finally(() => setLoadingRawContentId((id) => (id === expandedId ? null : id)));
  }, [expandedId, tenders]);

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
  const dateFilteredTenders = (() => {
    if (dateFilter) {
      const [y, m, d] = dateFilter.split("-").map(Number);
      return tenders.filter((t) => {
        if (!t.scraped_at) return false;
        return new Date(t.scraped_at).toDateString() === new Date(y, m - 1, d).toDateString();
      });
    }
    if (dateFromParam && dateToParam) {
      // Use UTC day boundaries so scraped_at (stored in UTC) isn't cut off by local timezone.
      const from = new Date(dateFromParam + "T00:00:00.000Z");
      const to   = new Date(dateToParam   + "T23:59:59.999Z");
      return tenders.filter((t) => {
        if (!t.scraped_at) return false;
        const d = new Date(t.scraped_at);
        return d >= from && d <= to;
      });
    }
    return tenders;
  })();

  // Cascading facets: each sidebar dropdown's options come from tenders matching every *other*
  // active facet (not itself), so e.g. picking a Country narrows which Categories are even
  // possible instead of always listing every value across the whole dataset — picking Kenya then
  // seeing a Category with zero Kenyan tenders would otherwise silently dead-end the user.
  type FacetKey = "type" | "country" | "category" | "status" | "pursuit";
  const applyFacets = useCallback(
    (skip: FacetKey | null) => {
      let list = dateFilteredTenders;
      if (skip !== "type" && typeFilterValue) list = list.filter((t) => t.tender_type === typeFilterValue);
      if (skip !== "country" && countryFilter) list = list.filter((t) => t.country === countryFilter);
      if (skip !== "category" && categoryFilter) list = list.filter((t) => t.category === categoryFilter);
      if (skip !== "status" && statusFilter) {
        const now = new Date();
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (statusFilter === "closing_soon") {
          list = list.filter((t) => t.status === "open" && t.closing_date && new Date(t.closing_date) >= now && new Date(t.closing_date) <= sevenDays);
        } else {
          list = list.filter((t) => t.status === statusFilter);
        }
      }
      if (skip !== "pursuit" && pursuitFilter) list = list.filter((t) => (pursuitFilter === "none" ? !t.pursuit_status : t.pursuit_status === pursuitFilter));
      return list;
    },
    [dateFilteredTenders, typeFilterValue, countryFilter, categoryFilter, statusFilter, pursuitFilter]
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
  // "none" is a synthetic option (not a real pursuit_status value) meaning "never reviewed" —
  // most tenders have no pursuit_status at all, and that's worth being able to filter to as much
  // as any of the real statuses.
  const pursuitOptionValues = useMemo(() => {
    const facetTenders = applyFacets("pursuit");
    const values = new Set(facetTenders.map((t) => t.pursuit_status || "none"));
    return values;
  }, [applyFacets]);
  const filteredTenders = applyFacets(null);

  const activeFilterCount = [typeFilterValue, countryFilter, categoryFilter, statusFilter, pursuitFilter].filter(Boolean).length;
  const clearAllFilters = () => {
    setTypeFilterValue(null);
    setCountryFilter(null);
    setCategoryFilter(null);
    setStatusFilter(null);
    setPursuitFilter(null);
    if (typeFilter) router.push("/tenders");
  };

  // Unified search filter integration
  const TENDER_FILTER_CATEGORIES: FilterCategoryDef[] = [
    { id: 'status', label: 'Status', icon: 'solar:info-circle-broken' },
    { id: 'pursuit', label: 'Pursuit', icon: 'solar:eye-broken' },
    { id: 'tender_type', label: 'Type', icon: 'solar:folder-2-broken' },
    { id: 'country', label: 'Country', icon: 'solar:map-point-broken' },
    { id: 'category', label: 'Category', icon: 'solar:tag-broken' },
  ];

  const tenderCategoryOptions = useMemo<Record<string, FilterOption[]>>(() => ({
    status: [
      { id: 'open', label: 'Open', category: 'status', value: 'open' },
      { id: 'closing_soon', label: 'Closing Soon', category: 'status', value: 'closing_soon' },
      { id: 'closed', label: 'Closed', category: 'status', value: 'closed' },
    ].filter(o => o.value === 'closing_soon' || statusOptionValues.has(o.value)),
    pursuit: [
      { id: 'none', label: 'Not reviewed', category: 'pursuit', value: 'none' },
      ...PURSUIT_OPTIONS.map(o => ({ id: o.value, label: o.label, category: 'pursuit', value: o.value })),
    ].filter(o => pursuitOptionValues.has(o.value)),
    tender_type: typeOptions.map(t => ({ id: t, label: t, category: 'tender_type', value: t })),
    country: countryOptions.map(c => ({ id: c, label: c, category: 'country', value: c })),
    category: categoryOptions.map(c => ({ id: c, label: c, category: 'category', value: c })),
  }), [statusOptionValues, pursuitOptionValues, typeOptions, countryOptions, categoryOptions]);

  // Reflect current sidebar filter state as initial pills in the unified bar
  const tenderInitialFilters = useMemo<ActiveFilter[]>(() => {
    const f: ActiveFilter[] = [];
    if (statusFilter) f.push({ category: 'status', values: [statusFilter], label: `Status: is ${statusFilter === 'closing_soon' ? 'closing soon' : statusFilter}`, operator: 'is' });
    if (pursuitFilter) f.push({ category: 'pursuit', values: [pursuitFilter === 'none' ? 'none' : pursuitFilter], label: `Pursuit: is ${pursuitFilter === 'none' ? 'not reviewed' : PURSUIT_OPTIONS.find(o => o.value === pursuitFilter)?.label ?? pursuitFilter}`, operator: 'is' });
    if (typeFilterValue) f.push({ category: 'tender_type', values: [typeFilterValue], label: `Type: is ${typeFilterValue}`, operator: 'is' });
    if (countryFilter) f.push({ category: 'country', values: [countryFilter], label: `Country: is ${countryFilter}`, operator: 'is' });
    if (categoryFilter) f.push({ category: 'category', values: [categoryFilter], label: `Category: is ${categoryFilter}`, operator: 'is' });
    return f;
  }, [statusFilter, pursuitFilter, typeFilterValue, countryFilter, categoryFilter]);

  const handleUnifiedFilterChange = useCallback((filters: ActiveFilter[]) => {
    const get = (cat: string) => filters.find(f => f.category === cat)?.values[0] ?? null;
    setStatusFilter(get('status') as 'open' | 'closed' | 'closing_soon' | null);
    setPursuitFilter(get('pursuit'));
    setTypeFilterValue(get('tender_type'));
    setCountryFilter(get('country'));
    setCategoryFilter(get('category'));
  }, []);


  usePageHeader({
    title: "Tenders",
    description: "All collected tenders",
    icon: "solar:case-minimalistic-broken",
    actions: [
      {
        label: "Add tender",
        icon: "solar:add-circle-broken",
        onClick: () => setAddTenderOpen(true),
      },
      {
        label: "Rejected candidates",
        icon: "solar:danger-triangle-broken",
        onClick: () => router.push(jobFilter ? `/rejected-candidates?job_id=${jobFilter}` : "/rejected-candidates"),
      },
      { label: "Website Sources", icon: "solar:global-broken", onClick: () => router.push("/website-sources") },
    ],
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">

      {jobFilter && (
        <RunFilterBanner
          jobId={jobFilter}
          onClear={() => router.push("/tenders")}
          resultsNoun="tenders"
        />
      )}

      {(sourceFilter || dateFilter) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-2.5 text-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500/15">
            <Icon icon="solar:filter-bold" width={12} className="text-brand-500" />
          </div>
          <span className="text-text-hi font-medium">
            {sourceFilter
              ? `Tenders from ${sourceLabel}`
              : `Tenders scraped on ${new Date(`${dateFilter}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`}
          </span>
          <span className="font-mono text-[11px] text-text-lo">
            {sourceFilter ? `${total} tenders` : `${filteredTenders.length} tenders`}
          </span>
          <button
            onClick={() => router.push("/tenders")}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-app-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-text-lo transition-colors hover:border-brand-500/30 hover:text-brand-500"
          >
            <Icon icon="solar:close-circle-broken" width={12} />
            Clear filter
          </button>
        </div>
      )}

      {/* Stat cards */}
      {!isLoading && tenders.length > 0 && (() => {
        const now = new Date();
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const openCount = filteredTenders.filter(t => t.status === "open").length;
        const closingSoon = filteredTenders.filter(t => {
          if (t.status !== "open" || !t.closing_date) return false;
          const d = new Date(t.closing_date);
          return d >= now && d <= sevenDays;
        }).length;
        const tracked = filteredTenders.filter(t => t.pursuit_status).length;
        const notReviewed = filteredTenders.filter(t => !t.pursuit_status).length;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Open" value={openCount} icon="solar:check-circle-broken" color="green" onClick={() => setStatusFilter(statusFilter === "open" ? null : "open")} />
            <StatCard title="Closing Soon" value={closingSoon} icon="solar:alarm-broken" color="yellow" onClick={() => setStatusFilter(statusFilter === "closing_soon" ? null : "closing_soon")} />
            <StatCard title="Tracked" value={tracked} icon="solar:eye-broken" color="blue" onClick={() => setPursuitFilter(pursuitFilter === "watching" ? null : "watching")} />
            <StatCard title="Not Reviewed" value={notReviewed} icon="solar:file-broken" color="gray" onClick={() => setPursuitFilter(pursuitFilter === "none" ? null : "none")} />
          </div>
        );
      })()}

      <div className="flex flex-col gap-4">
          <GenericTable<Tender>
            data={filteredTenders}
            columns={buildColumns(expandedId, setExpandedId)}
            loading={isLoading}
            emptyMessage="No tenders found. Start one from New Run, or set up a recurring search in Automation."
            selectable
            searchable
            searchPlaceholder="Search tenders…"
            filterCategories={TENDER_FILTER_CATEGORIES}
            categoryOptions={tenderCategoryOptions}
            singleSelectCategories={['status', 'pursuit', 'tender_type', 'country', 'category']}
            initialFilters={tenderInitialFilters}
            onUnifiedFilterChange={handleUnifiedFilterChange}
            enableDateFilter
            {...(dateFromParam && dateToParam ? {
              dateRange: {
                startDate: new Date(dateFromParam),
                endDate:   new Date(dateToParam),
                label:     "This week",
              },
            } : {})}
            enableStatusPills={false}
            showExportButton
            exportType="tenders"
            exportTitle="Tenders"
            onDelete={handleDeleteTender}
            confirmDelete
            deleteConfirmationProps={{
              itemType: "tender",
              message: (item) => `"${item?.title || "this tender"}"`,
              suppressToast: false,
            }}
            customRowRender={(row, _index, defaultRow) => (
              <Fragment key={row.id}>
                {defaultRow}
                {expandedId === row.id && (
                  <tr className="bg-surface-2">
                    <td
                      colSpan={10}
                      className="border-b border-app-border p-0"
                    >
                      <TenderDetail
                        tender={row}
                        isLoadingRaw={loadingRawContentId === row.id}
                        onPursuitSaved={(fields) => setTenders((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...fields } : t)))}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            )}
            fixedLayout
            hideActionsColumn
            pageSize={40}
            hideEmptyColumns={false}
            fullPageHeight={true}
            enableRefresh
            onRefresh={fetchTenders}
            showBulkBar
            getRowClassName={(row) =>
              expandedId === row.id ? "bg-surface-2/50" : ""
            }
          />
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

      <AddTenderModal
        isOpen={addTenderOpen}
        onClose={() => setAddTenderOpen(false)}
        onAdded={fetchTenders}
      />
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
