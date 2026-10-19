"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import GenericTable, { type Column, type Action } from "@/shared/ui/GenericTable";
import SimpleModal from "@/shared/ui/SimpleModal";
import LocationInput from "@/features/scraping/components/LocationInput";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { ActiveFilter, FilterCategoryDef, FilterOption } from "@/shared/ui/UnifiedSearchFilter";

interface Website {
  id: number;
  name: string | null;
  url: string;
  location: string | null;
  tender_type: string | null;
  last_scraped_at: string | null;
  tenders_count: number;
  scope: string | null;
}

/** GenericTable requires a string `id`; the API uses numeric ids. */
interface WebsiteRow extends Omit<Website, "id"> {
  id: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** tenders_count and the /tenders?source= link both key off hostname substring matching against
 * source_url (there's no website_id FK on tenders to join on directly) — this keeps both in sync
 * with the same value. Falls back to the raw url if it doesn't parse. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function AddSourceModal({ isOpen, onClose, onAdded, mode }: { isOpen: boolean; onClose: () => void; onAdded: (w: Website) => void; mode: "light" | "dark" }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [scope, setScope] = useState<"regional" | "international">("regional");
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(""); setName(""); setLocation(""); setScope("regional");
      setTimeout(() => inputRef.current?.focus(), 50);
      fetch("/api/countries").then((r) => r.json()).then((d) => {
        if (Array.isArray(d)) setCountries(d.map((c: any) => c.country_name).sort());
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, name: name.trim() || undefined, location: location.trim() || undefined, scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add source");
      onAdded(data.website);
      toast.success(`${data.website.name || data.website.url} added`);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Add Website Source" subtitle="This website will be included in every scheduled scrape run." width="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-lo">URL <span className="text-status-danger">*</span></label>
          <input ref={inputRef} value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="https://example.com/tenders" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-lo">Name <span className="font-normal">(optional)</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="e.g. Example Procurement Portal" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-lo">Location <span className="font-normal">(optional)</span></label>
          <LocationInput value={location} onChange={setLocation} countries={countries} placeholder="e.g. Kenya" mode={mode} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-lo">Scope</label>
          <div className="flex gap-2">
            {(["regional", "international"] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)} className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${scope === s ? "border-brand-500/40 bg-brand-500/10 text-brand-500" : "border-app-border text-text-lo hover:border-brand-500/30 hover:text-text-hi"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !url.trim()}>
            <Icon icon={saving ? "mdi:loading" : "solar:add-circle-broken"} width={14} className={saving ? "animate-spin" : ""} />
            {saving ? "Saving…" : "Add Source"}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}

export default function UploadWebsitePage() {
  const router = useRouter();
  const { resolvedMode: mode } = useTheme();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [scopeFilter, setScopeFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  const fetchWebsites = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/websites");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch websites");
      setWebsites(data.websites || []);
    } catch (err: any) {
      toast.error("Error fetching websites: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  const handleDelete = async (id: number) => {
    const previous = websites;
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    try {
      const res = await fetch(`/api/websites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete website");
    } catch (err: any) {
      setWebsites(previous);
      toast.error(err.message);
    }
  };

  const columns: Column<WebsiteRow>[] = [
    {
      Header: "Source",
      accessor: "name",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-text-hi">{row.name || row.url}</span>
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[11px] text-text-lo hover:text-brand-500"
          >
            {row.url}
          </a>
        </div>
      ),
    },
    {
      Header: "Location",
      accessor: "location",
      sortable: true,
      render: (row) =>
        row.location ? <Badge status="neutral">{row.location}</Badge> : <span className="text-text-lo">—</span>,
    },
    {
      Header: "Scope",
      accessor: "scope",
      sortable: true,
      render: (row) =>
        row.scope === "international" ? (
          <Badge status="info">International</Badge>
        ) : (
          <Badge status="neutral">Regional</Badge>
        ),
    },
    {
      Header: "Tenders Found",
      accessor: "tenders_count",
      sortable: true,
      render: (row) =>
        row.tenders_count > 0 ? (
          <a
            href={`/tenders?source=${encodeURIComponent(hostnameOf(row.url))}&sourceLabel=${encodeURIComponent(row.name || row.url)}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-sm font-medium text-brand-500 hover:underline"
          >
            {row.tenders_count.toLocaleString()}
          </a>
        ) : (
          <span className="text-text-lo">—</span>
        ),
    },
    {
      Header: "Last Scraped",
      accessor: "last_scraped_at",
      sortable: true,
      render: (row) =>
        row.last_scraped_at ? (
          <span className="text-sm text-text-hi">{formatDate(row.last_scraped_at)}</span>
        ) : (
          <Badge status="warning">Never</Badge>
        ),
    },
  ];

  const locationOptions = useMemo(
    () => Array.from(new Set(websites.map((w) => w.location).filter((l): l is string => Boolean(l)))).sort(),
    [websites]
  );

  const WEBSITE_FILTER_CATEGORIES: FilterCategoryDef[] = [
    { id: 'scope', label: 'Scope', icon: 'solar:global-broken' },
    { id: 'location', label: 'Location', icon: 'solar:map-point-broken' },
  ];

  const websiteCategoryOptions = useMemo<Record<string, FilterOption[]>>(() => ({
    scope: [
      { id: 'regional', label: 'Regional', category: 'scope', value: 'regional' },
      { id: 'international', label: 'International', category: 'scope', value: 'international' },
    ],
    location: locationOptions.map(l => ({ id: l, label: l, category: 'location', value: l })),
  }), [locationOptions]);

  const websiteInitialFilters = useMemo<ActiveFilter[]>(() => {
    const f: ActiveFilter[] = [];
    if (scopeFilter) f.push({ category: 'scope', values: [scopeFilter], label: `Scope: is ${scopeFilter}`, operator: 'is' });
    if (locationFilter) f.push({ category: 'location', values: [locationFilter], label: `Location: is ${locationFilter}`, operator: 'is' });
    return f;
  }, [scopeFilter, locationFilter]);

  const handleWebsiteFilterChange = useCallback((filters: ActiveFilter[]) => {
    const get = (cat: string) => filters.find(f => f.category === cat)?.values[0] ?? null;
    setScopeFilter(get('scope'));
    setLocationFilter(get('location'));
  }, []);

  const filteredWebsites = useMemo(
    () =>
      websites.filter((w) => {
        if (scopeFilter && (w.scope || "regional") !== scopeFilter) return false;
        if (locationFilter && w.location !== locationFilter) return false;
        return true;
      }),
    [websites, scopeFilter, locationFilter]
  );

  const actions: Action<WebsiteRow>[] = [
    {
      icon: (row) => (scanningId === Number(row.id) ? "mdi:loading" : "solar:play-circle-broken"),
      tooltip: "Scan now",
      label: "Scan",
      disabled: (row) => scanningId === Number(row.id),
      className: (row) => (scanningId === Number(row.id) ? "animate-spin" : ""),
      onClick: (row) => handleScan({ ...row, id: Number(row.id) }),
    },
  ];

  const handleScan = async (website: Website) => {
    setScanningId(website.id);
    try {
      const res = await fetch(`/api/websites/${website.id}/scan`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start scan");
      // /run-query's progress screen expects incremental visited/total URL counts, which a
      // single-site website scan never produces (one Firecrawl call, no interim steps) — it
      // would just show a permanently-stuck "0 results queued" screen. Stay here instead, and
      // point at /overview directly since that's the only page with a job status feed.
      toast.success(
        (t) => (
          <span>
            {`Scan started for "${website.name}" — `}
            <button
              className="font-medium text-brand-500 underline"
              onClick={() => {
                toast.dismiss(t.id);
                router.push("/overview");
              }}
            >
              view status on Overview
            </button>
          </span>
        ),
        { duration: 6000 }
      );
    } catch (err: any) {
      toast.error("Failed to start scan: " + err.message);
    } finally {
      setScanningId(null);
    }
  };

  usePageHeader({
    title: "Website Sources",
    description: "Tracked websites on every scheduled run",
    icon: "solar:global-broken",
    actions: [
      { label: "Add Source", icon: "solar:add-circle-broken", variant: "primary", onClick: () => setIsModalOpen(true) },
    ],
  });

  const handleSourceAdded = (w: Website) => {
    setWebsites((prev) => [w, ...prev].sort((a, b) => (a.name || a.url).localeCompare(b.name || b.url)));
  };

  return (
    <>
    <div className="mx-auto flex max-w-7xl flex-col gap-4">

      <GenericTable<WebsiteRow>
        data={filteredWebsites.map((w) => ({ ...w, id: String(w.id) }))}
        columns={columns}
        loading={isLoading}
        emptyMessage="No tracked websites yet — add one with the button above."
        searchable
        searchPlaceholder="Search sources…"
        filterCategories={WEBSITE_FILTER_CATEGORIES}
        categoryOptions={websiteCategoryOptions}
        singleSelectCategories={['scope', 'location']}
        initialFilters={websiteInitialFilters}
        onUnifiedFilterChange={handleWebsiteFilterChange}
        selectable
        showBulkBar
        showExportButton
        exportType="website-sources"
        exportTitle="Website Sources"
        enableDateFilter
        enableRefresh
        onRefresh={fetchWebsites}
        hideEmptyColumns={false}
        fullPageHeight={true}
        actions={actions}
        onDelete={(row) => handleDelete(Number(row.id))}
        confirmDelete
        deleteConfirmationProps={{
          itemType: "source",
          message: (item) => `"${item?.name || item?.url || "this source"}"`,
        }}
      />
    </div>

    <AddSourceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdded={handleSourceAdded} mode={mode} />
    </>
  );
}
