"use client";

import Sidebar from "@/widgets/app-shell/ui/Sidebar";
import Header from "@/widgets/app-shell/ui/Header";
import PageHeader from "@/shared/ui/PageHeader";
import SimpleFooter from "@/shared/ui/SimpleFooter";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { Icon } from "@iconify/react";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function UploadWebsitePage() {
  const { resolvedMode: mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead } = useNotifications();

  return (
    <div className={`min-h-screen flex flex-col pt-14 ${mode === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800" : "bg-gradient-to-b from-gray-50 to-gray-100"}`}>
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
          <div className="flex-1 p-6 transition-all duration-300 overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <PageHeader
                title="Upload Website"
                description="Add a new website source for tender scraping."
                icon="mdi:cloud-upload"
                mode={mode}
              />

              <div className="flex justify-center items-center h-64 bg-opacity-50 rounded-lg">
                <div className="flex flex-col items-center">
                  <Icon icon="fluent-emoji:construction" width={100} height={100} />
                  <p className={`mt-2 text-lg font-medium animate-pulse ${mode === "dark" ? "text-gray-300" : "text-[#231812]"}`}>Page under construction, check back later...</p>
                </div>
              </div>
            </div>
          </div>

          <SimpleFooter mode={mode} />
        </div>
      </div>
    </div>
  );
}
