"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import Button from "@/shared/ui/Button";
import { useTheme } from "@/shared/contexts/ThemeContext";
import LeadSearchForm from "@/features/leads/components/LeadSearchForm";
import LinkedInSearchForm from "@/features/leads/components/LinkedInSearchForm";
import LeadsTableV2, { LeadColumn } from "@/features/leads/components/LeadsTableV2";
import LeadsExportButton from "@/features/leads/components/LeadsExportButton";
import useRealtimeJob from "@/features/scraping/hooks/useRealtimeJob";

const gmbColumns: LeadColumn<any>[] = [
  { key: "business_name", label: "Business", render: (l) => l.business_name },
  { key: "category", label: "Category", render: (l) => l.category || "—" },
  { key: "phone", label: "Phone", render: (l) => l.phone || "—", mono: true },
  { key: "address", label: "Address", render: (l) => l.address || "—" },
  { key: "rating", label: "Rating", render: (l) => (l.rating ? `${l.rating} (${l.reviews_count ?? 0})` : "—"), mono: true },
];

const linkedinColumns: LeadColumn<any>[] = [
  { key: "full_name", label: "Name", render: (l) => l.full_name },
  { key: "headline", label: "Headline", render: (l) => l.headline || "—" },
  { key: "current_company", label: "Company", render: (l) => l.current_company || "—" },
  { key: "location", label: "Location", render: (l) => l.location || "—" },
];

function CancelRunningJob({ jobId }: { jobId: string }) {
  const [isCanceling, setIsCanceling] = useState(false);

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      toast.success("Canceling — the search will stop shortly.");
    } catch (err: any) {
      toast.error("Failed to cancel: " + err.message);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-md border border-app-border bg-surface px-3 py-2 text-sm text-text-lo">
      <span className="flex items-center gap-2">
        <Icon icon="mdi:loading" width={14} className="animate-spin text-brand-500" />
        Search running…
      </span>
      <Button size="sm" variant="danger" onClick={handleCancel} disabled={isCanceling}>
        {isCanceling ? "Canceling…" : "Cancel"}
      </Button>
    </div>
  );
}

function GmbTab({ mode }: { mode: "light" | "dark" }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const { scrapeStatus, setScrapeStatus } = useRealtimeJob(jobId);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leads");
      setLeads(data.leads || []);
    } catch (err: any) {
      toast.error("Error fetching leads: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (scrapeStatus === "complete") {
      toast.success("Lead search complete!");
      fetchLeads();
      setJobId(null);
      setScrapeStatus("idle");
    } else if (scrapeStatus === "error") {
      toast.error("Lead search failed.");
      setJobId(null);
      setScrapeStatus("idle");
    } else if (scrapeStatus === "canceled") {
      toast.success("Search canceled.");
      fetchLeads();
      setJobId(null);
      setScrapeStatus("idle");
    }
  }, [scrapeStatus, fetchLeads, setScrapeStatus]);

  const handleSearch = async (searchTerm: string, location: string) => {
    const toastId = toast.loading("Starting lead search...");
    try {
      const res = await fetch("/api/leads/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start search");
      setJobId(data.jobId);
      toast.success("Searching Google Maps... this can take a minute.", { id: toastId, duration: 4000 });
    } catch (err: any) {
      toast.error("Failed to start search: " + err.message, { id: toastId });
    }
  };

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
      <LeadSearchForm mode={mode} isRunning={scrapeStatus === "running"} onSubmit={handleSearch} />
      {scrapeStatus === "running" && jobId && <CancelRunningJob jobId={jobId} />}
      {!isLoading && leads.length > 0 && (
        <div className="flex justify-end">
          <LeadsExportButton leads={leads} filename="gmb_leads.csv" />
        </div>
      )}
      {isLoading ? (
        <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">Loading leads…</div>
      ) : (
        <LeadsTableV2 leads={leads} columns={gmbColumns} onDelete={handleDelete} sourceBadge="Google Maps" />
      )}
    </div>
  );
}

function LinkedInTab({ mode }: { mode: "light" | "dark" }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const { scrapeStatus, setScrapeStatus } = useRealtimeJob(jobId);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/linkedin-leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leads");
      setLeads(data.leads || []);
    } catch (err: any) {
      toast.error("Error fetching LinkedIn leads: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (scrapeStatus === "complete") {
      toast.success("LinkedIn search complete!");
      fetchLeads();
      setJobId(null);
      setScrapeStatus("idle");
    } else if (scrapeStatus === "error") {
      toast.error("LinkedIn search failed.");
      setJobId(null);
      setScrapeStatus("idle");
    }
  }, [scrapeStatus, fetchLeads, setScrapeStatus]);

  const handleSearch = async (searchQuery: string, location: string) => {
    const toastId = toast.loading("Starting LinkedIn search...");
    try {
      const res = await fetch("/api/linkedin-leads/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchQuery, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start search");
      setJobId(data.jobId);
      toast.success("Searching LinkedIn... this can take a minute.", { id: toastId, duration: 4000 });
    } catch (err: any) {
      toast.error("Failed to start search: " + err.message, { id: toastId });
    }
  };

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
      <LinkedInSearchForm mode={mode} isRunning={scrapeStatus === "running"} onSubmit={handleSearch} />
      {scrapeStatus === "running" && jobId && <CancelRunningJob jobId={jobId} />}
      {!isLoading && leads.length > 0 && (
        <div className="flex justify-end">
          <LeadsExportButton leads={leads} filename="linkedin_leads.csv" />
        </div>
      )}
      {isLoading ? (
        <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">Loading leads…</div>
      ) : (
        <LeadsTableV2 leads={leads} columns={linkedinColumns} onDelete={handleDelete} sourceBadge="LinkedIn" />
      )}
    </div>
  );
}

export default function LeadsPage() {
  const { resolvedMode: mode } = useTheme();
  const [activeTab, setActiveTab] = useState<"gmb" | "linkedin">("gmb");

  const tabs = [
    { id: "gmb" as const, label: "Google Maps" },
    { id: "linkedin" as const, label: "LinkedIn" },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-hi">Leads</h1>
          <p className="mt-0.5 text-sm text-text-lo">Business and people leads from Google Maps and LinkedIn.</p>
        </div>

        <div className="flex w-fit gap-1 rounded-md border border-app-border bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeTab === tab.id ? "bg-brand-500/10 text-brand-500" : "text-text-lo hover:text-text-hi"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "gmb" ? <GmbTab mode={mode} /> : <LinkedInTab mode={mode} />}
      </div>
    </AppShell>
  );
}
