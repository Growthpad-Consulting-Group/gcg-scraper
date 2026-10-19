"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import GenericTable, { type Column } from "@/shared/ui/GenericTable";
import SimpleModal from "@/shared/ui/SimpleModal";
// useTheme not needed — SimpleModal handles its own theme

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

// ─── Modal ────────────────────────────────────────────────────────────────────

function BlockDomainModal({
  isOpen,
  onClose,
  onAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (domain: BlockedDomain) => void;
}) {
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDomain("");
      setReason("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
      onAdded(data.blockedDomain);
      toast.success(`${data.blockedDomain.domain} blocked`);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Block a Domain"
      subtitle="Domains on this list are skipped during all future scrapes."
      width="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-lo">Domain</label>
          <input
            ref={inputRef}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="example.com"
            className={inputClass}
          />
          <p className="text-[11px] text-text-lo">
            Bare hostname only — e.g. <span className="font-mono">example.com</span>. Protocols and paths are stripped automatically.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-lo">Reason <span className="font-normal">(optional)</span></label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Subscription required"
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleAdd} disabled={isAdding || !domain.trim()}>
            <Icon icon={isAdding ? "mdi:loading" : "solar:shield-cross-broken"} width={14} className={isAdding ? "animate-spin" : ""} />
            {isAdding ? "Blocking…" : "Block domain"}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlockedDomainsPage() {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleAdded = (newDomain: BlockedDomain) => {
    setDomains((prev) => [...prev, newDomain].sort((a, b) => a.domain.localeCompare(b.domain)));
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
      render: (row) => <span className="font-mono text-sm font-medium text-text-hi">{row.domain}</span>,
    },
    {
      Header: "Reason",
      accessor: "reason",
      sortable: false,
      render: (row) =>
        row.reason ? <Badge status="neutral">{row.reason}</Badge> : <span className="text-text-lo">—</span>,
    },
    {
      Header: "Date Added",
      accessor: "created_at",
      sortable: true,
      render: (row) => <span className="text-sm text-text-lo">{formatDate(row.created_at)}</span>,
    },
  ];

  usePageHeader({
    title: "Blocked Domains",
    description: "Domains skipped during scraping",
    icon: "solar:shield-cross-broken",
    actions: [
      {
        label: "Block Domain",
        icon: "solar:add-circle-broken",
        variant: "primary",
        onClick: () => setIsModalOpen(true),
      },
    ],
  });

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <GenericTable<BlockedDomainRow>
          data={domains.map((d) => ({ ...d, id: String(d.id) }))}
          columns={columns}
          loading={isLoading}
          emptyMessage="No domains blocked yet."
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
          fullPageHeight
          onDelete={(row) => handleDelete(Number(row.id))}
          confirmDelete
          deleteConfirmationProps={{
            itemType: "domain",
            message: (item) => `"${item?.domain || "this domain"}"`,
          }}
        />
      </div>

      <BlockDomainModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdded={handleAdded}
      />
    </>
  );
}
