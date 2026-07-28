"use client";

import Sidebar from "@/shared/components/Sidebar";
import Header from "@/shared/components/Header";
import SimpleFooter from "@/shared/components/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { Icon } from "@iconify/react";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/app/providers";

export default function UploadWebsitePage() {
  const { mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { fullName, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();

  return (
    <div className={`min-h-screen flex flex-col pt-14 ${mode === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800" : "bg-gradient-to-b from-gray-50 to-gray-100"}`}>
      <Header
        toggleSidebar={toggleSidebar}
        isSidebarOpen={!!isSidebarOpen}
        mode={mode}
        toggleMode={toggleMode}
        onLogout={handleLogout}
        pageName="Tender Overview"
        pageDescription="Monitor and manage your tender scraping tasks."
        fullName={fullName}
        loading={userLoading}
        notifications={notifications}
        isLoading={notificationsLoading}
        onMarkAsRead={markNotificationAsRead}
      />
      <div className="flex flex-1">
        <Sidebar isOpen={!!isSidebarOpen} mode={mode} onLogout={handleLogout} toggleSidebar={toggleSidebar} fullName={fullName} />
        <div className="content-container flex-1 p-6 transition-all duration-300 overflow-hidden md:ml-[80px] sidebar-open:md:ml-[300px] sidebar-closed:md:ml-[80px]">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
              <div className="flex flex-col items-center">
                <Icon icon="fluent-emoji:construction" width={100} height={100} />
                <p className={`mt-2 text-lg font-medium animate-pulse ${mode === "dark" ? "text-gray-300" : "text-[#231812]"}`}>Page under construction, check back later...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SimpleFooter mode={mode} isSidebarOpen={!!isSidebarOpen} />
    </div>
  );
}
