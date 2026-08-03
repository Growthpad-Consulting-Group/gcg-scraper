"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { Icon } from "@iconify/react";
import Notifications from "@/shared/ui/Notifications";
import GlassPanel from "@/shared/ui/GlassPanel";
import FullscreenToggle from "@/shared/ui/FullscreenToggle";
import HeaderThemeDropdown from "@/widgets/app-shell/ui/header/HeaderThemeDropdown";
import HeaderAddNewDropdown from "@/widgets/app-shell/ui/header/HeaderAddNewDropdown";
import HeaderProfileDropdown from "@/widgets/app-shell/ui/header/HeaderProfileDropdown";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { Notification } from "@/shared/contexts/NotificationsContext";
import type { UserProfile } from "@/features/auth/hooks/useUserProfile";

export default function Header({
  mode,
  toggleSidebar,
  toggleMode,
  isSidebarOpen,
  onLogout,
  user = null,
  loading = false,
  notifications = [],
  isLoading = false,
  onMarkAsRead = () => {},
  onClearAll,
}: {
  mode: "light" | "dark";
  toggleSidebar: () => void;
  toggleMode: () => void;
  isSidebarOpen: boolean;
  onLogout: () => void;
  user?: UserProfile | null;
  loading?: boolean;
  notifications?: Notification[];
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
}) {
  const { mode: themeMode } = useTheme();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const router = useRouter();

  const addNewItems = useMemo(
    () => [
      { label: "Run Query", icon: "mdi:database-search", href: "/run-query" },
      { label: "Lead Search", icon: "mdi:map-marker-radius", href: "/leads" },
      { label: "Keyword", icon: "mdi:tag", href: "/keyword-manager" },
      { label: "Scheduled Task", icon: "akar-icons:schedule", href: "/scheduler" },
      { label: "Upload Website", icon: "mdi:cloud-upload", href: "/upload-website" },
    ],
    []
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const pillButtonClasses = `transition-all shrink-0 active:scale-95 backdrop-blur-md border ring-1 ring-inset ring-white/20 shadow-sm hover:shadow-md rounded-xl ${
    mode === "dark" ? "bg-gray-700/50 border-white/10 hover:bg-gray-600/60" : "bg-white/60 border-white/50 hover:bg-white/80"
  }`;

  return (
    <header ref={headerRef} className="sticky top-0 z-40">
      <GlassPanel
        mode={mode}
        className={`transition-all duration-300 animate-header-slide-in m-1 md:mx-8 md:mt-4 rounded-2xl`}
      >
        <div className="p-1 md:p-2 transition-all duration-300">
          <div className="flex items-center justify-between">
            {/* Left: Sidebar toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className={`text-gray-500 dark:text-gray-400 p-3 md:p-1 ${pillButtonClasses}`}
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <Icon
                  icon={isSidebarOpen ? "solar:double-alt-arrow-left-broken" : "solar:double-alt-arrow-right-broken"}
                  className="w-6 h-6"
                />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <button onClick={toggleMode} className="p-2 focus:outline-none md:hidden" aria-label="Toggle dark mode">
                {mode === "dark" ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
              </button>

              <div className="hidden md:block">
                <HeaderAddNewDropdown mode={mode} items={addNewItems} onNavigate={(href) => router.push(href)} />
              </div>

              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  title="Notifications"
                  className="relative group z-2 p-2 rounded-full focus:outline-none cursor-pointer"
                >
                  <Icon icon="solar:bell-bing-broken" className={`h-5 w-5 ${mode === "dark" ? "text-gray-100" : "text-gray-700"}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-medium border border-white z-10">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <div
                    className={`absolute top-12 right-0 w-96 rounded-2xl shadow-lg z-10 ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Notifications notifications={notifications} mode={mode} isLoading={isLoading} onMarkAsRead={onMarkAsRead} onClearAll={onClearAll} />
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <HeaderThemeDropdown mode={themeMode} resolvedMode={mode} />
              </div>

              <div className="hidden md:block">
                <FullscreenToggle mode={mode} />
              </div>

              <HeaderProfileDropdown mode={mode} user={user} loading={loading} onLogout={onLogout} />
            </div>
          </div>
        </div>
      </GlassPanel>
    </header>
  );
}
