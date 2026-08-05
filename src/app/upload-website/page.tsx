"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import PageHeader from "@/shared/ui/PageHeader";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/shared/ui/Table";

interface Website {
  id: number;
  name: string | null;
  url: string;
  location: string | null;
  tender_type: string | null;
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
        />

        <div className="flex flex-col gap-3 rounded-lg border border-app-border bg-surface p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              className="h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500 sm:col-span-1"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
            />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={isSubmitting} className="self-start">
            <Icon icon={isSubmitting ? "mdi:loading" : "solar:add-circle-broken"} width={16} className={isSubmitting ? "animate-spin" : ""} />
            Add Source
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-app-border bg-surface">
            <Icon icon="mdi:loading" width={28} className="animate-spin text-brand-500" />
          </div>
        ) : websites.length === 0 ? (
          <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">No tracked websites yet — add one above.</div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Source</TableTh>
                <TableTh>Location</TableTh>
                <TableTh className="w-32" />
              </TableRow>
            </TableHead>
            <TableBody>
              {websites.map((website) => (
                <TableRow key={website.id}>
                  <TableTd>
                    <div className="flex flex-col">
                      <span className="font-medium text-text-hi">{website.name || website.url}</span>
                      <a href={website.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-text-lo hover:text-brand-500">
                        {website.url}
                      </a>
                    </div>
                  </TableTd>
                  <TableTd>{website.location ? <Badge status="neutral">{website.location}</Badge> : <span className="text-text-lo">—</span>}</TableTd>
                  <TableTd>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleScan(website)}
                        disabled={scanningId === website.id}
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-text-lo hover:bg-surface-2 hover:text-brand-500 disabled:opacity-50"
                        title="Scan now"
                      >
                        <Icon icon={scanningId === website.id ? "mdi:loading" : "solar:play-circle-broken"} width={14} className={scanningId === website.id ? "animate-spin" : ""} />
                        Scan
                      </button>
                      <button
                        onClick={() => handleDelete(website.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-text-lo hover:bg-status-danger/10 hover:text-status-danger"
                        aria-label="Remove source"
                      >
                        <Icon icon="solar:trash-bin-trash-broken" width={14} />
                      </button>
                    </div>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}
