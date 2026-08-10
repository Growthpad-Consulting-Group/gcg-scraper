"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import PageHeader from "@/shared/ui/PageHeader";
import Badge from "@/shared/ui/Badge";
import GlassPanel from "@/shared/ui/GlassPanel";
import Button from "@/shared/ui/Button";
import GenericTable, { type Column } from "@/shared/ui/GenericTable";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface BlockedDomain {
  id: number;
  domain: string;
  reason: string | null;
  created_at: string;
}

interface BlockedDomainRow extends Omit<BlockedDomain, "id"> {
  id: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function BlockedDomainsPage() {
  const { resolvedMode: mode } = useTheme();
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const inputClass = `h-9 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500`;

  const fetchDomains = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/blocked-domains");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setDomains(data.blockedDomains || []);
    } catch (err: any) {
      toast.error("Error loading blocked domains: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  const handleAdd = async () => {
    const trimmed = domain.trim();
    if (!trimmed) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/blocked-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed, reason: reason.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setDomains((prev) => [...prev, data.blockedDomain].sort((a, b) => a.domain.localeCompare(b.domain)));
      setDomain("");
      setReason("");
      toast.success(`${data.blockedDomain.domain} blocked`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    const previous = domains;
    setDomains((prev) => prev.filter((d) => d.id !== id));
    try {
      const res = await fetch(`/api/blocked-domains/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err: any) {
      setDomains(previous);
      toast.error(err.message);
    }
  };

  const columns: Column<BlockedDomainRow>[] = [
    {
      Header: "Domain",
      accessor: "domain",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-medium text-text-hi">{row.domain}</span>
      ),
    },
    {
      Header: "Reason",
      accessor: "reason",
      sortable: false,
      render: (row) =>
        row.reason
          ? <Badge status="neutral">{row.reason}</Badge>
          : <span className="text-text-lo">—</span>,
    },
    {
      Header: "Date Added",
      accessor: "created_at",
      sortable: true,
      render: (row) => <span className="text-sm text-text-lo">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Blocked Domains"
        description="Domains listed here are skipped during search-query scraping — useful for paywalled sites, login-required portals, or sources that never return useful tender data."
        icon="solar:shield-cross-broken"
      />

      {/* Add form */}
      <GlassPanel mode={mode} className="flex flex-col gap-3 rounded-lg p-4">
        <p className="text-sm font-medium text-text-hi">Block a domain</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="example.com"
            className={`${inputClass} flex-1`}
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Reason (optional) — e.g. Subscription required"
            className={`${inputClass} flex-1`}
          />
          <Button size="sm" onClick={handleAdd} disabled={isAdding || !domain.trim()}>
            <Icon icon={isAdding ? "mdi:loading" : "solar:add-circle-broken"} width={15} className={isAdding ? "animate-spin" : ""} />
            Block domain
          </Button>
        </div>
        <p className="text-xs text-text-lo">
          Enter the bare hostname — e.g. <span className="font-mono">example.com</span>. Protocols and paths are stripped automatically.
        </p>
      </GlassPanel>

      <GenericTable<BlockedDomainRow>
        data={domains.map((d) => ({ ...d, id: String(d.id) }))}
        columns={columns}
        loading={isLoading}
        title="Blocked Domains"
        emptyMessage="No domains blocked yet — add one above."
        searchable
        searchPlaceholder="Search domains…"
        selectable
        showBulkBar
        showExportButton
        exportType="blocked-domains"
        exportTitle="Blocked Domains"
        enableDateFilter
        enableRefresh
        onRefresh={fetchDomains}
        hideEmptyColumns={false}
        fullPageHeight={true}
        onDelete={(row) => handleDelete(Number(row.id))}
        confirmDelete
        deleteConfirmationProps={{
          itemType: "domain",
          message: (item) => `"${item?.domain || "this domain"}"`,
        }}
      />
    </div>
  );
}
