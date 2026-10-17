"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { Icon } from "@iconify/react";
import Notifications from "@/shared/ui/Notifications";
import GlassPanel from "@/shared/ui/GlassPanel";
import FullscreenToggle from "@/shared/ui/FullscreenToggle";
import HeaderThemeDropdown from "@/widgets/app-shell/ui/header/HeaderThemeDropdown";
import HeaderProfileDropdown from "@/widgets/app-shell/ui/header/HeaderProfileDropdown";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useCommandPalette } from "@/shared/contexts/CommandPaletteContext";
import { usePageHeaderValue } from "@/shared/contexts/PageHeaderContext";
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
  const { open: openCommandPalette } = useCommandPalette();
  const pageHeader = usePageHeaderValue();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const router = useRouter();

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

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 flex items-stretch gap-3 animate-header-slide-in m-1 md:mx-8 md:mt-4 transition-all duration-300"
    >
      {/* LEFT PANEL — sidebar toggle + page title/icon/actions */}
      <GlassPanel mode={mode} className="flex-1 min-w-0 rounded-2xl h-full">
        <div className="flex h-full items-center gap-2 px-2 py-1.5">
          <button
            onClick={toggleSidebar}
            className="group p-2 rounded-full text-gray-500 dark:text-gray-100 shrink-0 transition-all active:scale-95 hover:bg-black/5 dark:hover:bg-white/10"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Icon
              icon={isSidebarOpen ? "solar:double-alt-arrow-left-broken" : "solar:double-alt-arrow-right-broken"}
              className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
            />
          </button>

          {pageHeader && (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-4 w-px bg-app-border/60 shrink-0" />

              {pageHeader.icon && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
                  <Icon icon={pageHeader.icon} className="h-3.5 w-3.5 text-white" />
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-sm font-semibold leading-tight text-text-hi truncate">
                  {pageHeader.title}
                </h1>
                {pageHeader.description && (
                  <p className="text-xs text-text-lo truncate hidden sm:block">
                    {pageHeader.description}
                  </p>
                )}
              </div>

              {(pageHeader.content || (pageHeader.actions && pageHeader.actions.length > 0)) && (
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {pageHeader.content}
                  {pageHeader.actions?.map((action, i) => (
                    <button
                      key={i}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      title={action.title}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        action.variant === 'primary'
                          ? 'bg-brand-500 text-white hover:bg-brand-600'
                          : mode === 'dark'
                            ? 'text-gray-300 hover:bg-white/10'
                            : 'text-gray-600 hover:bg-black/5'
                      }`}
                    >
                      {action.icon && <Icon icon={action.icon} className="h-3.5 w-3.5" />}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </GlassPanel>

      {/* RIGHT PANEL — utility actions */}
      <GlassPanel mode={mode} className="shrink-0 rounded-2xl h-full px-2 py-1.5">
        <div className="flex h-full items-center gap-1.5 md:gap-2">
          <button onClick={toggleMode} className="p-2 focus:outline-none md:hidden" aria-label="Toggle dark mode">
            {mode === "dark" ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
          </button>

          <button
            onClick={openCommandPalette}
            title="Search (⌘K)"
            className="group p-2 rounded-full transition-all active:scale-95 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Icon
              icon="solar:magnifer-broken"
              className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 text-gray-700 dark:text-gray-100"
            />
          </button>

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              title="Notifications"
              className="relative group p-2 rounded-full transition-all active:scale-95 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <Icon
                icon="solar:bell-bing-broken"
                className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 text-gray-700 dark:text-gray-100"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-medium border border-white z-10">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute top-12 right-0 w-96 z-10" onClick={(e) => e.stopPropagation()}>
                <GlassPanel mode={mode} className={`rounded-2xl ${mode === "dark" ? "bg-gray-900/40 text-white" : "bg-white/40 text-[#231812]"}`}>
                  <Notifications
                    notifications={notifications}
                    mode={mode}
                    isLoading={isLoading}
                    onMarkAsRead={onMarkAsRead}
                    onClearAll={onClearAll}
                    onNavigate={() => setIsNotificationsOpen(false)}
                  />
                </GlassPanel>
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
      </GlassPanel>
    </header>
  );
}
