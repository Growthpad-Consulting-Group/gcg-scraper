"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { usePageHeader } from "@/shared/contexts/PageHeaderContext";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

const NAV: SidebarNavGroup[] = [
  {
    title: "Monitoring",
    items: [
      { id: "usage", label: "Provider Usage", icon: "solar:chart-2-broken", href: "/settings/usage" },
      { id: "sources", label: "Source Health", icon: "solar:health-broken", href: "/settings/sources" },
    ],
  },
  {
    title: "Keywords",
    items: [
      { id: "keywords", label: "Keyword Library", icon: "solar:hashtag-broken", href: "/settings/keywords" },
      { id: "linkedin", label: "LinkedIn Phrases", icon: "mdi:linkedin", href: "/settings/linkedin" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { id: "notifications", label: "Notifications", icon: "solar:bell-broken", href: "/settings/notifications" },
      { id: "retention", label: "Retention", icon: "solar:archive-broken", href: "/settings/retention" },
    ],
  },
];

function useLocalStorageBool(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored === "true");
    } catch {}
  }, [key]);

  const set = (v: boolean) => {
    setValue(v);
    try { localStorage.setItem(key, String(v)); } catch {}
  };

  return [value, set];
}

export default function SettingsSidebarLayout({ children }: { children: ReactNode }) {
  const { resolvedMode: mode } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useLocalStorageBool("settingsSidebarExpanded", true);
  const [mobileOpen, setMobileOpen] = useState(false);

  usePageHeader({
    title: "Settings",
    description: "Configure and manage your scraper.",
    icon: "solar:settings-minimalistic-broken",
  });

  const allItems = NAV.flatMap((g) => g.items);
  const isDark = mode === "dark";

  return (
    <div className={`flex flex-col w-full relative min-h-screen ${isDark ? "" : "bg-slate-50"}`}>
      <div className="w-full">
        <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 w-full min-w-0">

          {/* Sidebar */}
          {(isExpanded || !mobileOpen) && (
            <div
              className={`shrink-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-800/60 overflow-y-auto max-h-[calc(100vh-200px)] sticky top-24 h-fit z-20 transition-all duration-300 overflow-x-hidden ${
                !isExpanded
                  ? "hidden sm:block w-[72px] min-w-[72px] max-w-[72px] px-1.5 py-2"
                  : "hidden sm:block w-full sm:w-64 p-2"
              }`}
            >
              {!isExpanded ? (
                /* Collapsed icon rail */
                <div className="flex flex-col items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    title="Expand sidebar"
                    className="flex items-center justify-center p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <Icon icon="solar:double-alt-arrow-right-broken" className="w-6 h-6" />
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700/80 mx-1 my-0.5" />
                  {allItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => router.push(item.href)}
                        className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-300 ${
                          active
                            ? "bg-gradient-to-r from-gcg-orange to-gcg-orange-dark text-white shadow-lg shadow-gcg-orange/20"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Expanded full sidebar */
                <>
                  <div className="flex justify-end mb-2 px-0.5">
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      title="Collapse sidebar"
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <Icon icon="solar:double-alt-arrow-left-broken" className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {NAV.map((group, gi) => (
                      <div key={group.title}>
                        {gi > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-800/60 mx-4 mb-4" />
                        )}
                        <div className="space-y-1">
                          <label className="block text-sm font-bold text-slate-400 dark:text-slate-500 mb-3 px-4">
                            {group.title}
                          </label>
                          {group.items.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => { router.push(item.href); setMobileOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                                  active
                                    ? "bg-gradient-to-r from-gcg-orange to-gcg-orange-dark text-white shadow-lg shadow-gcg-orange/20 scale-[1.02]"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}
                              >
                                <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
                                <span className="text-sm font-bold truncate flex-1 text-left">
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile sidebar overlay */}
          {mobileOpen && (
            <div className="sm:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
              <div className="relative w-64 bg-white dark:bg-slate-900 p-2 shadow-2xl overflow-y-auto">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Icon icon="solar:close-circle-broken" className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  {NAV.map((group, gi) => (
                    <div key={group.title}>
                      {gi > 0 && <div className="border-t border-slate-100 dark:border-slate-800/60 mx-4 mb-4" />}
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-400 dark:text-slate-500 mb-3 px-4">
                          {group.title}
                        </label>
                        {group.items.map((item) => {
                          const active = pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => { router.push(item.href); setMobileOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                                active
                                  ? "bg-gradient-to-r from-gcg-orange to-gcg-orange-dark text-white shadow-lg shadow-gcg-orange/20"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
                              <span className="text-sm font-bold truncate flex-1 text-left">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 w-full sm:w-0 overflow-hidden relative">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="relative group overflow-hidden bg-gradient-to-r from-gcg-orange to-gcg-orange-dark text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 active:scale-95 flex items-center justify-center border border-white/20"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Icon
            icon={mobileOpen ? "solar:close-circle-broken" : "solar:hamburger-menu-broken"}
            className="w-6 h-6 relative z-10"
          />
        </button>
      </div>
    </div>
  );
}
