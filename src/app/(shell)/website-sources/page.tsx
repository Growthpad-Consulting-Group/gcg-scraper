"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Select from "react-select";
import PageHeader from "@/shared/ui/PageHeader";
import Badge from "@/shared/ui/Badge";
import GenericTable, { type Column, type Action } from "@/shared/ui/GenericTable";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getSelectStyles, getSelectValue } from "@/utils/selectStyles";

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

export default function UploadWebsitePage() {
  const router = useRouter();
  const { resolvedMode: mode } = useTheme();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Website Sources"
        description="Tracked websites checked on every scheduled run. Add a new one from Run Query → Website."
        icon="solar:global-broken"
        actions={[
          {
            label: "Add Source",
            icon: "solar:add-circle-broken",
            variant: "primary",
            onClick: () => router.push("/run-query?mode=website"),
          },
        ]}
      />

      <GenericTable<WebsiteRow>
        data={filteredWebsites.map((w) => ({ ...w, id: String(w.id) }))}
        columns={columns}
        loading={isLoading}
        title="Website Sources"
        emptyMessage="No tracked websites yet — add one from Run Query."
        searchable
        searchPlaceholder="Search sources…"
        selectable
        showBulkBar
        showExportButton
        exportType="website-sources"
        exportTitle="Website Sources"
        extraFilters={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-40">
              <Select
                value={scopeFilter ? { value: scopeFilter, label: scopeFilter === "international" ? "International" : "Regional" } : null}
                onChange={(opt) => setScopeFilter(getSelectValue(opt) || null)}
                options={[
                  { value: "regional", label: "Regional" },
                  { value: "international", label: "International" },
                ]}
                placeholder="All scopes"
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
                styles={getSelectStyles<{ value: string; label: string }>(mode)}
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                menuPosition="fixed"
              />
            </div>
            <div className="w-48">
              <Select
                value={locationFilter ? { value: locationFilter, label: locationFilter } : null}
                onChange={(opt) => setLocationFilter(getSelectValue(opt) || null)}
                options={locationOptions.map((l) => ({ value: l, label: l }))}
                placeholder="All locations"
                isClearable
                isSearchable
                noOptionsMessage={() => "No locations found"}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={getSelectStyles<{ value: string; label: string }>(mode)}
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                menuPosition="fixed"
              />
            </div>
          </div>
        }
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
  );
}
