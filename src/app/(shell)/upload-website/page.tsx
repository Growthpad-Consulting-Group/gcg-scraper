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
}

/** GenericTable requires a string `id`; the API uses numeric ids. */
interface WebsiteRow extends Omit<Website, "id"> {
  id: string;
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
      router.push(`/run-query?taskId=${data.jobId}`);
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
        emptyMessage="No tracked websites yet — add one from Run Query."
        searchable
        searchPlaceholder="Search sources…"
        selectable={false}
        showBulkBar={false}
        showExportButton={false}
        enableDateFilter={false}
        hideEmptyColumns={false}
        fullPageHeight={false}
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
