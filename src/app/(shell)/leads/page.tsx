"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PageHeader from "@/shared/ui/PageHeader";
import RunFilterBanner from "@/shared/ui/RunFilterBanner";
import Badge from "@/shared/ui/Badge";
import LogPanel from "@/shared/ui/LogPanel";
import GenericTable, { type Column } from "@/shared/ui/GenericTable";
import LeadsExportButton from "@/features/leads/components/LeadsExportButton";

interface LeadColumn<T> {
  key: string;
  label: string;
  render: (lead: T) => React.ReactNode;
  mono?: boolean;
}

interface Lead {
  id: string;
  [key: string]: unknown;
}

const gmbColumns: LeadColumn<any>[] = [
  { key: "business_name", label: "Business", render: (l) => l.business_name },
  { key: "category", label: "Category", render: (l) => l.category || "—" },
  { key: "phone", label: "Phone", render: (l) => l.phone || "—", mono: true },
  { key: "email", label: "Email", render: (l) => l.email || "—", mono: true },
  {
    key: "contact",
    label: "Contact",
    render: (l) =>
      l.contact_name ? (
        <span className="flex flex-col">
          <span>{l.contact_name}</span>
          {l.contact_email && <span className="text-xs text-text-lo">{l.contact_email}</span>}
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "contact_linkedin",
    label: "LinkedIn",
    render: (l) =>
      l.contact_linkedin ? (
        <a href={l.contact_linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          Profile
        </a>
      ) : (
        "—"
      ),
  },
  { key: "address", label: "Address", render: (l) => l.address || "—" },
  { key: "rating", label: "Rating", render: (l) => (l.rating ? `${l.rating} (${l.reviews_count ?? 0})` : "—"), mono: true },
];

const linkedinColumns: LeadColumn<any>[] = [
  { key: "full_name", label: "Name", render: (l) => l.full_name },
  { key: "headline", label: "Headline", render: (l) => l.headline || "—" },
  { key: "current_company", label: "Company", render: (l) => l.current_company || "—" },
  { key: "email", label: "Email", render: (l) => l.email || "—", mono: true },
  { key: "location", label: "Location", render: (l) => l.location || "—" },
];

const redditColumns: LeadColumn<any>[] = [
  { key: "title", label: "Post", render: (l) => l.title },
  { key: "subreddit", label: "Subreddit", render: (l) => (l.subreddit ? `r/${l.subreddit}` : "—") },
  { key: "author", label: "Author", render: (l) => (l.author ? `u/${l.author}` : "—") },
  { key: "upvotes", label: "Upvotes", render: (l) => l.upvotes ?? "—", mono: true },
  { key: "num_comments", label: "Comments", render: (l) => l.num_comments ?? "—", mono: true },
  {
    key: "post_url",
    label: "Link",
    render: (l) =>
      l.post_url ? (
        <a href={l.post_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          View
        </a>
      ) : (
        "—"
      ),
  },
];

function LeadsResultsTable<T extends Lead>({
  leads,
  columns,
  onDelete,
  sourceBadge,
  isLoading,
  onRefresh,
  exportTitle,
}: {
  leads: T[];
  columns: LeadColumn<T>[];
  onDelete: (id: string) => void;
  sourceBadge: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  exportTitle?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tableColumns: Column<T>[] = [
    ...columns.map((col) => ({
      Header: col.label,
      accessor: col.key,
      className: col.mono ? "font-mono max-w-[220px] truncate" : "max-w-[220px] truncate",
      render: (row: T) => col.render(row),
    })),
    {
      Header: "Source",
      accessor: "__source",
      sortable: false,
      render: () => <Badge status="neutral">{sourceBadge}</Badge>,
    },
  ];

  const customRowRender = (row: T, _index: number, defaultRow: React.ReactNode) => {
    const expanded = expandedId === row.id;
    return (
      <>
        {defaultRow}
        {expanded && (
          <tr className="hover:bg-transparent">
            <td colSpan={tableColumns.length + 2} className="bg-canvas p-3">
              <LogPanel autoScroll={false} lines={[{ text: JSON.stringify(row, null, 2), tone: "default" }]} />
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <GenericTable<T>
      data={leads}
      columns={tableColumns}
      loading={isLoading}
      onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
      rowClickable
      customRowRender={customRowRender}
      emptyMessage="No leads yet — find some from Run Query."
      searchable
      searchPlaceholder="Search leads…"
      selectable
      showBulkBar
      showExportButton
      exportType="leads"
      exportTitle={exportTitle || "Leads"}
      enableDateFilter
      enableRefresh={!!onRefresh}
      onRefresh={onRefresh}
      hideEmptyColumns={false}
      fullPageHeight={true}
      confirmDelete
      deleteConfirmationProps={{
        itemType: "lead",
        message: (item) => `"${item?.business_name || item?.full_name || item?.title || "this lead"}"`,
        suppressToast: false,
      }}
      onDelete={(row) => onDelete(row.id)}
    />
  );
}

function GmbTab({ jobFilter, onClearFilter }: { jobFilter: string | null; onClearFilter: () => void }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads${jobFilter ? `?job=${jobFilter}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leads");
      setLeads(data.leads || []);
    } catch (err: any) {
      toast.error("Error fetching leads: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [jobFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDelete = async (id: string | number) => {
    const previous = leads;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
    } catch (err: any) {
      setLeads(previous);
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {jobFilter && <RunFilterBanner jobId={jobFilter} onClear={onClearFilter} resultsNoun="leads" />}
      <LeadsResultsTable
        leads={leads}
        columns={gmbColumns}
        onDelete={handleDelete}
        sourceBadge="Google Maps"
        isLoading={isLoading}
        onRefresh={fetchLeads}
        exportTitle="Google Maps Leads"
      />
    </div>
  );
}

function LinkedInTab({ jobFilter, onClearFilter }: { jobFilter: string | null; onClearFilter: () => void }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/linkedin-leads${jobFilter ? `?job=${jobFilter}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leads");
      setLeads(data.leads || []);
    } catch (err: any) {
      toast.error("Error fetching LinkedIn leads: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [jobFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDelete = async (id: string | number) => {
    const previous = leads;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/linkedin-leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
    } catch (err: any) {
      setLeads(previous);
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {jobFilter && <RunFilterBanner jobId={jobFilter} onClear={onClearFilter} resultsNoun="leads" />}
      <LeadsResultsTable
        leads={leads}
        columns={linkedinColumns}
        onDelete={handleDelete}
        sourceBadge="LinkedIn"
        isLoading={isLoading}
        onRefresh={fetchLeads}
        exportTitle="LinkedIn Leads"
      />
    </div>
  );
}

function RedditTab({ jobFilter, onClearFilter }: { jobFilter: string | null; onClearFilter: () => void }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reddit-leads${jobFilter ? `?job=${jobFilter}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leads");
      setLeads(data.leads || []);
    } catch (err: any) {
      toast.error("Error fetching Reddit leads: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [jobFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDelete = async (id: string | number) => {
    const previous = leads;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/reddit-leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
    } catch (err: any) {
      setLeads(previous);
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {jobFilter && <RunFilterBanner jobId={jobFilter} onClear={onClearFilter} resultsNoun="leads" />}
      <LeadsResultsTable
        leads={leads}
        columns={redditColumns}
        onDelete={handleDelete}
        sourceBadge="Reddit"
        isLoading={isLoading}
        onRefresh={fetchLeads}
        exportTitle="Reddit Mentions"
      />
    </div>
  );
}

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobFilter = searchParams?.get("job") || null;
  const tabParam = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState<"gmb" | "linkedin" | "reddit">(
    tabParam === "linkedin" ? "linkedin" : tabParam === "reddit" ? "reddit" : "gmb"
  );

  useEffect(() => {
    if (tabParam === "linkedin" || tabParam === "gmb" || tabParam === "reddit") setActiveTab(tabParam);
  }, [tabParam]);

  const tabs = [
    { id: "gmb" as const, label: "Google Maps" },
    { id: "linkedin" as const, label: "LinkedIn" },
    { id: "reddit" as const, label: "Reddit" },
  ];

  const clearFilter = () => router.push("/leads");

  return (
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Leads"
          description="Business and people leads from Google Maps and LinkedIn."
          icon="solar:map-point-broken"
          actions={[
            {
              label: "Find Leads",
              icon: "solar:play-circle-broken",
              variant: "primary",
              onClick: () =>
                router.push(`/run-query?mode=${activeTab === "gmb" ? "gmb-leads" : activeTab === "linkedin" ? "linkedin-leads" : "reddit-leads"}`),
            },
          ]}
        />

        <div className="flex w-fit gap-1 rounded-md border border-app-border bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (jobFilter) router.push("/leads");
              }}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeTab === tab.id ? "bg-brand-500/10 text-brand-500" : "text-text-lo hover:text-text-hi"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "gmb" ? (
          <GmbTab jobFilter={jobFilter} onClearFilter={clearFilter} />
        ) : activeTab === "linkedin" ? (
          <LinkedInTab jobFilter={jobFilter} onClearFilter={clearFilter} />
        ) : (
          <RedditTab jobFilter={jobFilter} onClearFilter={clearFilter} />
        )}
      </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsContent />
    </Suspense>
  );
}
