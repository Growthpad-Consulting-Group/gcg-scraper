"use client";

  import { useState, useEffect, useCallback } from "react";
  import { useRouter } from "next/navigation";
  import toast from "react-hot-toast";
  import { Icon } from "@iconify/react";
  import AppShell from "@/widgets/app-shell/ui/AppShell";
  import PageHeader from "@/shared/ui/PageHeader";
  import Badge from "@/shared/ui/Badge";
  import Button from "@/shared/ui/Button";
  import SimpleModal from "@/shared/ui/SimpleModal";
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
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  const handleAdd = async () => {
    if (!url.trim()) {
      toast.error("A website URL is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add website");
      setWebsites((prev) => [data.website, ...prev]);
      setName("");
      setUrl("");
      setLocation("");
      setIsAddModalOpen(false);
      toast.success("Source added.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Upload Website"
          description="Add a website as a tracked source. Every scheduled run checks it for tenders — click Scan Now to check it immediately."
          icon="solar:cloud-upload-broken"
          actions={[
            {
              label: "Add Source",
              icon: "solar:add-circle-broken",
              variant: "primary",
              onClick: () => setIsAddModalOpen(true),
            },
          ]}
        />

        <GenericTable<WebsiteRow>
          data={websites.map((w) => ({ ...w, id: String(w.id) }))}
          columns={columns}
          loading={isLoading}
          emptyMessage="No tracked websites yet — add one above."
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

      <SimpleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Source"
        subtitle="Track a new website for scheduled tender scraping."
        width="max-w-lg"
      >
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/tenders"
            className="h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
          />
          <Button size="sm" onClick={handleAdd} disabled={isSubmitting} className="self-start">
            <Icon icon={isSubmitting ? "mdi:loading" : "solar:add-circle-broken"} width={16} className={isSubmitting ? "animate-spin" : ""} />
            Add Source
          </Button>
        </div>
      </SimpleModal>
    </AppShell>
  );
}
