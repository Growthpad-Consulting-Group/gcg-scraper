"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Sidebar from "@/widgets/app-shell/ui/Sidebar";
import Header from "@/widgets/app-shell/ui/Header";
import PageHeader from "@/shared/ui/PageHeader";
import SimpleFooter from "@/shared/ui/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/shared/contexts/ThemeContext";
import LeadSearchForm from "@/features/leads/components/LeadSearchForm";
import LeadsTable from "@/features/leads/components/LeadsTable";
import LinkedInSearchForm from "@/features/leads/components/LinkedInSearchForm";
import LinkedInLeadsTable from "@/features/leads/components/LinkedInLeadsTable";
import useRealtimeJob from "@/features/scraping/hooks/useRealtimeJob";

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

  const handleDelete = async (id: string) => {
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
    <div className="space-y-6">
      <LeadSearchForm mode={mode} isRunning={scrapeStatus === "running"} onSubmit={handleSearch} />
      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
          <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
        </div>
      ) : (
        <LeadsTable leads={leads} mode={mode} onDelete={handleDelete} />
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

  const handleDelete = async (id: string) => {
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
    <div className="space-y-6">
      <LinkedInSearchForm mode={mode} isRunning={scrapeStatus === "running"} onSubmit={handleSearch} />
      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
          <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
        </div>
      ) : (
        <LinkedInLeadsTable leads={leads} mode={mode} onDelete={handleDelete} />
      )}
    </div>
  );
}

export default function LeadsPage() {
  const { resolvedMode: mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<"gmb" | "linkedin">("gmb");

  const tabs = [
    { id: "gmb" as const, label: "Google Maps", icon: "mdi:map-marker-radius" },
    { id: "linkedin" as const, label: "LinkedIn", icon: "mdi:linkedin" },
  ];

  return (
    <div className={`flex flex-col ${mode === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800" : "bg-gradient-to-b from-gray-50 to-gray-100"}`}>
      <div className="flex flex-1">
        <Sidebar isOpen={!!isSidebarOpen} mode={mode} onLogout={handleLogout} toggleSidebar={toggleSidebar} user={user} loading={userLoading} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            toggleSidebar={toggleSidebar}
            isSidebarOpen={!!isSidebarOpen}
            mode={mode}
            toggleMode={toggleMode}
            onLogout={handleLogout}
            user={user}
            loading={userLoading}
            notifications={notifications}
            isLoading={notificationsLoading}
            onMarkAsRead={markNotificationAsRead}
          />
        <div className="h-full flex-1 p-6 transition-all duration-300 overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader
              title="Business Leads"
              description="Find business and people leads from Google Maps and LinkedIn."
              icon="mdi:map-marker-radius"
              mode={mode}
            />

            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-5 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? `bg-[#f05d23] bg-opacity-10 text-[#f05d23] ${mode === "dark" ? "ring-1 ring-[#f05d23] ring-opacity-40" : "shadow-sm"}`
                      : `${mode === "dark" ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"}`
                  }`}
                >
                  <Icon icon={tab.icon} className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "gmb" ? <GmbTab mode={mode} /> : <LinkedInTab mode={mode} />}
          </div>
        </div>

          <SimpleFooter mode={mode} />
        </div>
      </div>
    </div>
  );
}
