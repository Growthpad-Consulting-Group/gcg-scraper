"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";
import RunFilterBanner from "@/shared/ui/RunFilterBanner";
import Badge, { type BadgeStatus } from "@/shared/ui/Badge";
import GenericTable, { type Column } from "@/shared/ui/GenericTable";

// ─── Lead status ─────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "qualified" | "not_relevant" | "converted";

const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string; badge: BadgeStatus }[] = [
  { value: "new",          label: "New",          badge: "info" },
  { value: "contacted",    label: "Contacted",    badge: "warning" },
  { value: "qualified",    label: "Qualified",    badge: "success" },
  { value: "not_relevant", label: "Not Relevant", badge: "neutral" },
  { value: "converted",    label: "Converted",    badge: "success" },
];

function LeadStatusBadge({ status }: { status: LeadStatus | null | undefined }) {
  if (!status) return <span className="text-xs text-text-lo">—</span>;
  const opt = LEAD_STATUS_OPTIONS.find((o) => o.value === status);
  return <Badge status={opt?.badge ?? "neutral"}>{opt?.label ?? status}</Badge>;
}

function LeadStatusPicker({
  value,
  onChange,
  apiPath,
  id,
}: {
  value: LeadStatus | null;
  onChange: (s: LeadStatus | null) => void;
  apiPath: string;
  id: string;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: LeadStatus | null) => {
    setSaving(true);
    try {
      const res = await fetch(`${apiPath}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_status: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      onChange(next);
    } catch {
      toast.error("Could not update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {LEAD_STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          disabled={saving}
          onClick={() => handleChange(value === opt.value ? null : opt.value)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "border-brand-500/40 bg-brand-500/10 text-brand-500"
              : "border-app-border bg-surface text-text-lo hover:border-brand-500/30 hover:text-text-hi"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── GMB detail card ─────────────────────────────────────────────────────────

function GmbDetailCard({ lead, onStatusChange }: { lead: any; onStatusChange: (id: string, s: LeadStatus | null) => void }) {
  const mapsUrl = lead.address
    ? `https://www.google.com/maps/search/${encodeURIComponent(lead.business_name + " " + (lead.address ?? ""))}`
    : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 text-xs">
          {lead.address   && <div className="flex gap-2"><Icon icon="solar:map-point-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><span className="text-text-hi">{lead.address}</span></div>}
          {lead.phone     && <div className="flex gap-2"><Icon icon="solar:phone-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><a href={`tel:${lead.phone}`} className="text-brand-500 hover:underline">{lead.phone}</a></div>}
          {lead.email     && <div className="flex gap-2"><Icon icon="solar:letter-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><a href={`mailto:${lead.email}`} className="text-brand-500 hover:underline">{lead.email}</a></div>}
          {lead.website   && <div className="flex gap-2"><Icon icon="solar:global-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline truncate">{lead.website}</a></div>}
          {lead.rating    && <div className="flex gap-2"><Icon icon="solar:star-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><span className="text-text-hi">{lead.rating} ({lead.reviews_count ?? 0} reviews)</span></div>}
        </div>
        {(lead.contact_name || lead.contact_email || lead.contact_linkedin) && (
          <div className="flex flex-col gap-2 rounded-xl border border-app-border bg-surface-2 p-3 text-xs">
            <p className="font-semibold text-text-hi">Contact</p>
            {lead.contact_name    && <span className="text-text-hi">{lead.contact_name}</span>}
            {lead.contact_email   && <a href={`mailto:${lead.contact_email}`} className="text-brand-500 hover:underline">{lead.contact_email}</a>}
            {lead.contact_linkedin && <a href={lead.contact_linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-500 hover:underline"><Icon icon="mdi:linkedin" width={12} />LinkedIn profile</a>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-app-border pt-3">
        <span className="shrink-0 text-xs text-text-lo">Status:</span>
        <LeadStatusPicker value={lead.lead_status} onChange={(s) => onStatusChange(lead.id, s)} apiPath="/api/leads" id={lead.id} />
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1 text-xs text-text-lo hover:text-brand-500 hover:border-brand-500/30">
            <Icon icon="solar:map-point-broken" width={12} />Open in Maps
          </a>
        )}
      </div>
    </div>
  );
}

// ─── LinkedIn detail card ─────────────────────────────────────────────────────

function LinkedInDetailCard({ lead, onStatusChange }: { lead: any; onStatusChange: (id: string, s: LeadStatus | null) => void }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <div className="flex flex-col gap-2 text-xs">
        {lead.location && <div className="flex gap-2"><Icon icon="solar:map-point-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><span className="text-text-hi">{lead.location}</span></div>}
        {lead.email    && <div className="flex gap-2"><Icon icon="solar:letter-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><a href={`mailto:${lead.email}`} className="text-brand-500 hover:underline">{lead.email}</a></div>}
        {lead.headline && <div className="flex gap-2"><Icon icon="solar:user-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><span className="text-text-hi">{lead.headline}</span></div>}
      </div>
      <div className="flex items-center gap-3 border-t border-app-border pt-3">
        <span className="shrink-0 text-xs text-text-lo">Status:</span>
        <LeadStatusPicker value={lead.lead_status} onChange={(s) => onStatusChange(lead.id, s)} apiPath="/api/linkedin-leads" id={lead.id} />
        {lead.profile_url && (
          <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1 text-xs text-text-lo hover:text-brand-500 hover:border-brand-500/30">
            <Icon icon="mdi:linkedin" width={12} />View Profile
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Reddit detail card ───────────────────────────────────────────────────────

function RedditDetailCard({ lead, onStatusChange }: { lead: any; onStatusChange: (id: string, s: LeadStatus | null) => void }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <div className="flex flex-col gap-2 text-xs">
        {lead.author   && <div className="flex gap-2"><Icon icon="mdi:reddit" width={13} className="mt-0.5 shrink-0 text-text-lo" /><span className="text-text-hi">u/{lead.author}</span></div>}
        {lead.posted_at && <div className="flex gap-2"><Icon icon="solar:calendar-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><span className="text-text-hi">{new Date(lead.posted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></div>}
        {lead.matched_keyword && <div className="flex gap-2"><Icon icon="solar:hashtag-broken" width={13} className="mt-0.5 shrink-0 text-text-lo" /><span className="font-mono text-brand-500">{lead.matched_keyword}</span></div>}
      </div>
      <div className="flex items-center gap-3 border-t border-app-border pt-3">
        <span className="shrink-0 text-xs text-text-lo">Status:</span>
        <LeadStatusPicker value={lead.lead_status} onChange={(s) => onStatusChange(lead.id, s)} apiPath="/api/reddit-leads" id={lead.id} />
        {lead.post_url && (
          <a href={lead.post_url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1 text-xs text-text-lo hover:text-brand-500 hover:border-brand-500/30">
            <Icon icon="mdi:reddit" width={12} />View Post
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function LeadStatBar({ leads }: { leads: any[] }) {
  const total     = leads.length;
  const contacted = leads.filter((l) => l.lead_status === "contacted").length;
  const qualified = leads.filter((l) => l.lead_status === "qualified").length;
  const converted = leads.filter((l) => l.lead_status === "converted").length;
  const unreviewed = leads.filter((l) => !l.lead_status).length;

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {[
        { label: "Total",       value: total,      icon: "solar:users-group-two-rounded-broken", color: "text-text-hi" },
        { label: "Unreviewed",  value: unreviewed, icon: "solar:eye-closed-broken",              color: "text-text-lo" },
        { label: "Contacted",   value: contacted,  icon: "solar:letter-broken",                  color: "text-status-warning" },
        { label: "Qualified",   value: qualified,  icon: "solar:check-circle-broken",            color: "text-status-success" },
        { label: "Converted",   value: converted,  icon: "solar:star-broken",                    color: "text-brand-500" },
      ].map(({ label, value, icon, color }) => (
        <div key={label} className="flex items-center gap-2 rounded-xl border border-app-border bg-surface px-3 py-2 text-xs">
          <Icon icon={icon} width={14} className={color} />
          <span className="font-semibold text-text-hi">{value}</span>
          <span className="text-text-lo">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

type TabKind = "gmb" | "linkedin" | "reddit";

function buildGmbColumns(expandedId: string | null, setExpandedId: (id: string | null) => void, onStatusChange: (id: string, s: LeadStatus | null) => void): Column<any>[] {
  return [
    {
      Header: "Business",
      accessor: "business_name",
      sortable: true,
      width: 280,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-text-hi">{row.business_name}</span>
          {row.category && <span className="text-[11px] text-text-lo">{row.category}</span>}
        </div>
      ),
    },
    {
      Header: "Contact",
      accessor: "email",
      sortable: false,
      width: 200,
      render: (row) => (
        <div className="flex flex-col gap-0.5 text-xs">
          {row.phone   && <a href={`tel:${row.phone}`} onClick={(e) => e.stopPropagation()} className="text-brand-500 hover:underline font-mono">{row.phone}</a>}
          {row.email   && <a href={`mailto:${row.email}`} onClick={(e) => e.stopPropagation()} className="text-brand-500 hover:underline truncate max-w-[180px]">{row.email}</a>}
          {!row.phone && !row.email && <span className="text-text-lo">—</span>}
        </div>
      ),
    },
    {
      Header: "Location",
      accessor: "location",
      sortable: true,
      width: 160,
      render: (row) => <span className="text-xs text-text-hi">{row.location || row.address || "—"}</span>,
    },
    {
      Header: "Rating",
      accessor: "rating",
      sortable: true,
      width: 100,
      render: (row) => row.rating ? (
        <div className="flex items-center gap-1 text-xs">
          <Icon icon="solar:star-bold" width={11} className="text-amber-400" />
          <span className="font-medium text-text-hi">{row.rating}</span>
          <span className="text-text-lo">({row.reviews_count ?? 0})</span>
        </div>
      ) : <span className="text-xs text-text-lo">—</span>,
    },
    {
      Header: "Status",
      accessor: "lead_status",
      sortable: true,
      width: 130,
      render: (row) => <LeadStatusBadge status={row.lead_status} />,
    },
  ];
}

function buildLinkedinColumns(): Column<any>[] {
  return [
    {
      Header: "Person",
      accessor: "full_name",
      sortable: true,
      width: 220,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.profile_url ? (
            <a href={row.profile_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-medium text-text-hi hover:text-brand-500 hover:underline">
              {row.full_name}
            </a>
          ) : (
            <span className="font-medium text-text-hi">{row.full_name}</span>
          )}
          {row.headline && <span className="text-[11px] text-text-lo line-clamp-1">{row.headline}</span>}
        </div>
      ),
    },
    {
      Header: "Company",
      accessor: "current_company",
      sortable: true,
      width: 180,
      render: (row) => <span className="text-xs text-text-hi">{row.current_company || "—"}</span>,
    },
    {
      Header: "Email",
      accessor: "email",
      sortable: false,
      width: 200,
      render: (row) => row.email ? (
        <a href={`mailto:${row.email}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-brand-500 hover:underline">{row.email}</a>
      ) : <span className="text-xs text-text-lo">—</span>,
    },
    {
      Header: "Location",
      accessor: "location",
      sortable: true,
      width: 160,
      render: (row) => <span className="text-xs text-text-hi">{row.location || "—"}</span>,
    },
    {
      Header: "Status",
      accessor: "lead_status",
      sortable: true,
      width: 130,
      render: (row) => <LeadStatusBadge status={row.lead_status} />,
    },
  ];
}

function buildRedditColumns(): Column<any>[] {
  return [
    {
      Header: "Post",
      accessor: "title",
      sortable: true,
      width: 380,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.post_url ? (
            <a href={row.post_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-medium text-text-hi hover:text-brand-500 hover:underline line-clamp-2">
              {row.title}
            </a>
          ) : (
            <span className="font-medium text-text-hi line-clamp-2">{row.title}</span>
          )}
          {row.matched_keyword && (
            <span className="font-mono text-[10px] text-brand-500">{row.matched_keyword}</span>
          )}
        </div>
      ),
    },
    {
      Header: "Subreddit",
      accessor: "subreddit",
      sortable: true,
      width: 140,
      render: (row) => <span className="font-mono text-xs text-text-hi">{row.subreddit ? `r/${row.subreddit}` : "—"}</span>,
    },
    {
      Header: "Author",
      accessor: "author",
      sortable: true,
      width: 130,
      render: (row) => <span className="font-mono text-xs text-text-lo">{row.author ? `u/${row.author}` : "—"}</span>,
    },
    {
      Header: "Votes",
      accessor: "upvotes",
      sortable: true,
      width: 80,
      render: (row) => <span className="font-mono text-xs text-text-hi">{row.upvotes ?? "—"}</span>,
    },
    {
      Header: "Status",
      accessor: "lead_status",
      sortable: true,
      width: 130,
      render: (row) => <LeadStatusBadge status={row.lead_status} />,
    },
  ];
}

// ─── Tab components ───────────────────────────────────────────────────────────

const LEAD_CATEGORY_OPTIONS = {
  lead_status: [
    { id: "lead_status_new",          category: "lead_status", value: "new",          label: "New" },
    { id: "lead_status_contacted",    category: "lead_status", value: "contacted",    label: "Contacted" },
    { id: "lead_status_qualified",    category: "lead_status", value: "qualified",    label: "Qualified" },
    { id: "lead_status_not_relevant", category: "lead_status", value: "not_relevant", label: "Not Relevant" },
    { id: "lead_status_converted",    category: "lead_status", value: "converted",    label: "Converted" },
    { id: "lead_status_none",         category: "lead_status", value: "none",         label: "Unreviewed" },
  ],
};

function LeadsTab({
  leads,
  isLoading,
  onRefresh,
  onDelete,
  onStatusChange,
  jobFilter,
  onClearFilter,
  tab,
}: {
  leads: any[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: LeadStatus | null) => void;
  jobFilter: string | null;
  onClearFilter: () => void;
  tab: TabKind;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns =
    tab === "gmb"
      ? buildGmbColumns(expandedId, setExpandedId, onStatusChange)
      : tab === "linkedin"
      ? buildLinkedinColumns()
      : buildRedditColumns();

  const customRowRender = (row: any, _i: number, defaultRow: React.ReactNode) => {
    const expanded = expandedId === row.id;
    return (
      <>
        {defaultRow}
        {expanded && (
          <tr className="hover:bg-transparent">
            <td colSpan={columns.length + 2} className="bg-canvas p-0">
              {tab === "gmb"      && <GmbDetailCard      lead={row} onStatusChange={onStatusChange} />}
              {tab === "linkedin" && <LinkedInDetailCard  lead={row} onStatusChange={onStatusChange} />}
              {tab === "reddit"   && <RedditDetailCard    lead={row} onStatusChange={onStatusChange} />}
            </td>
          </tr>
        )}
      </>
    );
  };

  const exportTitles: Record<TabKind, string> = { gmb: "Google Maps Leads", linkedin: "LinkedIn Leads", reddit: "Reddit Mentions" };

  return (
    <div className="flex flex-col gap-3">
      {jobFilter && <RunFilterBanner jobId={jobFilter} onClear={onClearFilter} resultsNoun="leads" />}
      <LeadStatBar leads={leads} />
      <GenericTable
        data={leads}
        columns={columns}
        loading={isLoading}
        filterCategories={[{ id: "lead_status", label: "Status", icon: "solar:tag-broken" }]}
        categoryOptions={LEAD_CATEGORY_OPTIONS}
        onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
        rowClickable
        customRowRender={customRowRender}
        emptyMessage="No leads yet — find some from New Run."
        searchable
        searchPlaceholder="Search leads…"
        selectable
        showBulkBar
        showExportButton
        exportType="leads"
        exportTitle={exportTitles[tab]}
        enableDateFilter
        enableRefresh
        onRefresh={onRefresh}
        hideEmptyColumns={false}
        fullPageHeight
        confirmDelete
        deleteConfirmationProps={{
          itemType: "lead",
          message: (item: any) => `"${item?.business_name || item?.full_name || item?.title || "this lead"}"`,
          suppressToast: false,
        }}
        onDelete={(row: any) => onDelete(row.id)}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const API_PATHS: Record<TabKind, string> = {
  gmb:      "/api/leads",
  linkedin: "/api/linkedin-leads",
  reddit:   "/api/reddit-leads",
};

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobFilter = searchParams?.get("job") || null;
  const tabParam = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState<TabKind>(
    tabParam === "linkedin" ? "linkedin" : tabParam === "reddit" ? "reddit" : "gmb"
  );
  const [leads, setLeads] = useState<Record<TabKind, any[]>>({ gmb: [], linkedin: [], reddit: [] });
  const [loading, setLoading] = useState<Record<TabKind, boolean>>({ gmb: true, linkedin: true, reddit: true });

  useEffect(() => {
    if (tabParam === "linkedin" || tabParam === "gmb" || tabParam === "reddit") setActiveTab(tabParam);
  }, [tabParam]);

  const fetchTab = useCallback(async (tab: TabKind) => {
    setLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      const res = await fetch(`${API_PATHS[tab]}${jobFilter ? `?job=${jobFilter}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leads");
      const key = tab === "gmb" ? "leads" : tab === "linkedin" ? "leads" : "leads";
      setLeads((prev) => ({ ...prev, [tab]: data[key] || data.leads || [] }));
    } catch (err: any) {
      toast.error("Error fetching leads: " + err.message);
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [jobFilter]);

  useEffect(() => { fetchTab("gmb"); fetchTab("linkedin"); fetchTab("reddit"); }, [fetchTab]);

  const handleDelete = (tab: TabKind) => async (id: string) => {
    const previous = leads[tab];
    setLeads((prev) => ({ ...prev, [tab]: prev[tab].filter((l) => l.id !== id) }));
    try {
      const res = await fetch(`${API_PATHS[tab]}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
    } catch (err: any) {
      setLeads((prev) => ({ ...prev, [tab]: previous }));
      toast.error(err.message);
    }
  };

  const handleStatusChange = (tab: TabKind) => (id: string, status: LeadStatus | null) => {
    setLeads((prev) => ({
      ...prev,
      [tab]: prev[tab].map((l) => (l.id === id ? { ...l, lead_status: status } : l)),
    }));
  };

  const clearFilter = () => router.push("/leads");

  const tabs: { id: TabKind; label: string; icon: string }[] = [
    { id: "gmb",      label: "Google Maps", icon: "solar:map-point-broken" },
    { id: "linkedin", label: "LinkedIn",    icon: "mdi:linkedin" },
    { id: "reddit",   label: "Reddit",      icon: "mdi:reddit" },
  ];

  usePageHeader({
    title: "Leads",
    description: "Google Maps, LinkedIn & Reddit leads",
    icon: "solar:map-point-broken",
    actions: [
      {
        label: "Find Leads",
        icon: "solar:play-circle-broken",
        variant: "primary",
        onClick: () => router.push(`/run-query?mode=${activeTab === "gmb" ? "gmb-leads" : activeTab === "linkedin" ? "linkedin-leads" : "reddit-leads"}`),
      },
    ],
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      {/* Tabs with count badges */}
      <div className="flex w-fit gap-1 rounded-xl border border-app-border bg-surface p-1">
        {tabs.map((tab) => {
          const count = leads[tab.id].length;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (jobFilter) router.push("/leads");
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeTab === tab.id ? "bg-brand-500/10 text-brand-500" : "text-text-lo hover:text-text-hi"
              }`}
            >
              <Icon icon={tab.icon} width={14} />
              {tab.label}
              {!loading[tab.id] && count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  activeTab === tab.id ? "bg-brand-500/20 text-brand-500" : "bg-surface-2 text-text-lo"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <LeadsTab
        leads={leads[activeTab]}
        isLoading={loading[activeTab]}
        onRefresh={() => fetchTab(activeTab)}
        onDelete={handleDelete(activeTab)}
        onStatusChange={handleStatusChange(activeTab)}
        jobFilter={jobFilter}
        onClearFilter={clearFilter}
        tab={activeTab}
      />
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
