"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/widgets/app-shell/ui/Sidebar";
import Header from "@/widgets/app-shell/ui/Header";
import PageHeader from "@/shared/ui/PageHeader";
import SimpleFooter from "@/shared/ui/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import TenderTable from "@/features/tenders/components/TenderTable";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function TendersPage() {
  const { resolvedMode: mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();
  const [tenders, setTenders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTenders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tenders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tenders");
      setTenders(data.tenders || []);
    } catch (err: any) {
      toast.error("Error fetching tenders: " + err.message);
      setTenders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  const handleDeleteTender = async (tender: any) => {
    const loadingToastId = toast.loading("Deleting tender...");
    try {
      setTenders((prev) => prev.filter((t) => t.source_url !== tender.source_url));
      const res = await fetch(`/api/tenders/${tender.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete tender");
      toast.success("Tender deleted successfully!", { id: loadingToastId });
    } catch (err: any) {
      await fetchTenders();
      toast.error("Failed to delete tender. Please try again.", { id: loadingToastId });
    }
  };

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
        <div className="h-full sm:h-[calc(100vh-200px)] flex-1 p-6 transition-all duration-300 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <PageHeader
              title="Tender Overview"
              description="Monitor and manage your tender scraping tasks."
              icon="mdi:briefcase-search"
              mode={mode}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
                <div className="flex flex-col items-center">
                  <Icon icon="mdi:loading" width={40} height={40} className="animate-spin text-[#f05d23]" />
                  <p className={`mt-2 text-lg font-medium animate-pulse ${mode === "dark" ? "text-gray-300" : "text-[#231812]"}`}>Loading, please wait...</p>
                </div>
              </div>
            ) : (
              <div className={mode === "dark" ? "text-white" : ""}>
                <TenderTable tenders={tenders} isLoading={isLoading} mode={mode} onDeleteTender={handleDeleteTender} />
              </div>
            )}
          </div>
        </div>

          <SimpleFooter mode={mode} />
        </div>
      </div>
    </div>
  );
}
