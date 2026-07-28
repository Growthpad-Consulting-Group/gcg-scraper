"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Sidebar from "@/shared/components/Sidebar";
import Header from "@/shared/components/Header";
import SimpleFooter from "@/shared/components/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/app/providers";
import LeadSearchForm from "@/features/leads/components/LeadSearchForm";
import LeadsTable from "@/features/leads/components/LeadsTable";
import useRealtimeJob from "@/features/scraping/hooks/useRealtimeJob";

export default function LeadsPage() {
  const { mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { fullName, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();

  const [leads, setLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);

  const { scrapeStatus, setScrapeStatus } = useRealtimeJob(jobId);

  const fetchLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch leads");
      setLeads(data.leads || []);
    } catch (err: any) {
      toast.error("Error fetching leads: " + err.message);
    } finally {
      setIsLoadingLeads(false);
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

  const isRunning = scrapeStatus === "running";

  return (
    <div className={`flex flex-col ${mode === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800" : "bg-gradient-to-b from-gray-50 to-gray-100"}`}>
      <Header
        toggleSidebar={toggleSidebar}
        isSidebarOpen={!!isSidebarOpen}
        mode={mode}
        toggleMode={toggleMode}
        onLogout={handleLogout}
        pageName="Business Leads"
        pageDescription="Find business leads from Google Maps."
        fullName={fullName}
        loading={userLoading}
        notifications={notifications}
        isLoading={notificationsLoading}
        onMarkAsRead={markNotificationAsRead}
      />
      <div className="flex flex-1">
        <Sidebar isOpen={!!isSidebarOpen} mode={mode} onLogout={handleLogout} toggleSidebar={toggleSidebar} fullName={fullName} />
        <div className="content-container h-full flex-1 p-6 transition-all duration-300 overflow-hidden md:ml-[80px] sidebar-open:md:ml-[300px] sidebar-closed:md:ml-[80px]">
          <div className="max-w-7xl mx-auto mt-10 space-y-6">
            <LeadSearchForm mode={mode} isRunning={isRunning} onSubmit={handleSearch} />

            {isLoadingLeads ? (
              <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
                <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
              </div>
            ) : (
              <LeadsTable leads={leads} mode={mode} onDelete={handleDelete} />
            )}
          </div>
        </div>
      </div>
      <SimpleFooter mode={mode} isSidebarOpen={!!isSidebarOpen} />
    </div>
  );
}
