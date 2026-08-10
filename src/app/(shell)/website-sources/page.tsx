"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PageHeader from "@/shared/ui/PageHeader";
import Badge from "@/shared/ui/Badge";
import GenericTable, { type Column, type Action } from "@/shared/ui/GenericTable";

interface Website {
  id: number;
  name: string | null;
  url: string;
  location: string | null;
  tender_type: string | null;
  created_at: string | null;
  last_scraped_at: string | null;
  tenders_count: number;
}

/** GenericTable requires a string `id`; the API uses numeric ids. */
interface WebsiteRow extends Omit<Website, "id"> {
  id: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function UploadWebsitePage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanningId, setScanningId] = useState<number | null>(null);

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
      Header: "Tenders Found",
      accessor: "tenders_count",
      sortable: true,
      render: (row) =>
        row.tenders_count > 0 ? (
          <span className="font-mono text-sm font-medium text-text-hi">{row.tenders_count.toLocaleString()}</span>
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
    {
      Header: "Date Added",
      accessor: "created_at",
      sortable: true,
      render: (row) => <span className="text-sm text-text-lo">{formatDate(row.created_at)}</span>,
    },
  ];

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
        data={websites.map((w) => ({ ...w, id: String(w.id) }))}
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
