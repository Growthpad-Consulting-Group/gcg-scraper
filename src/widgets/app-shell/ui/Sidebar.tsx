"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { sidebarNavGroups } from "@/shared/lib/nav";
import { NAV_SHORTCUTS } from "@/widgets/app-shell/lib/shortcuts";
import SidebarUserMenu from "@/widgets/app-shell/ui/sidebar/SidebarUserMenu";
import type { UserProfile } from "@/features/auth/hooks/useUserProfile";

export default function Sidebar({
  isOpen,
  mode,
  onLogout,
  toggleSidebar,
  user = null,
  loading = false,
}: {
  isOpen: boolean;
  mode: "light" | "dark";
  onLogout: () => void;
  toggleSidebar: () => void;
  user?: UserProfile | null;
  loading?: boolean;
}) {
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sidebarNavGroups.map((g) => [g.category, true]))
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (isOpen && windowWidth !== null && windowWidth < 640 && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        toggleSidebar();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen, windowWidth, toggleSidebar]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  if (windowWidth === null) return null;

  const isActive = (href: string) => pathname === href;
  const isMobile = windowWidth < 640;

  return (
    <div
      ref={sidebarRef}
      className={`shrink-0 z-50 transition-all duration-300 ${
        isMobile ? "fixed inset-y-0 left-0 m-0" : "sticky top-0 h-screen my-1 md:my-4 md:ml-4"
      }`}
      style={{ width: isOpen ? "240px" : isMobile ? "0" : "64px" }}
    >
      <div
        className={`relative h-full flex flex-col border transition-all duration-300 ${isMobile ? "rounded-none" : "rounded-3xl"} ${
          mode === "dark"
            ? "bg-[#131417]/80 backdrop-blur-2xl border-white/5 text-gray-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
            : "bg-white/70 backdrop-blur-2xl border-white/20 text-gray-800 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]"
        }`}
      >
        {/* Logo — collapse/expand is Header's job; sidebar only gets a close (X) button on mobile */}
        <div className={`flex items-center h-[72px] shrink-0 py-4 px-2 border-b border-white/10 dark:border-white/5 ${isOpen ? "px-6 justify-between" : "px-0 justify-center"}`}>
          {isOpen ? (
            <Link href="/overview" title="Go to Overview">
              <Image
                src={mode === "dark" ? "/assets/images/logo-white.svg" : "/assets/images/logo.svg"}
                alt="Growthpad Logo"
                width={150}
                height={62}
                className="w-[150px] h-[62px] object-contain transition-opacity hover:opacity-80"
              />
            </Link>
          ) : (
            <Link href="/overview" title="Go to Overview">
              <Image
                src={mode === "dark" ? "/favicon-white.png" : "/favicon.png"}
                alt="Growthpad Logo"
                width={40}
                height={40}
                className="object-contain mx-auto transition-opacity hover:opacity-80"
              />
            </Link>
          )}

          {isMobile && (
            <button
              onClick={toggleSidebar}
              title="Close Sidebar"
              aria-label="Close Sidebar"
              className="text-gray-500 dark:text-gray-400 hover:text-[#f05d23] transition-all p-2 rounded-full hover:bg-white/10"
            >
              <Icon icon="solar:close-circle-broken" className="w-6 h-6" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 scrollbar-hide">
          {sidebarNavGroups.map((group, gi) => (
            <div key={group.category} className={`w-full ${gi > 0 ? "pt-4" : ""} ${!isOpen ? "flex flex-col items-center" : ""}`}>
              {isOpen ? (
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer group transition-all duration-200"
                  onClick={() => toggleCategory(group.category)}
                >
                  <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                    {group.category}
                  </span>
                  <Icon
                    icon="solar:alt-arrow-right-broken"
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${expandedCategories[group.category] ? "rotate-90" : ""}`}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center py-2 cursor-pointer group"
                  onClick={() => toggleCategory(group.category)}
                  onMouseEnter={() => {
                    if (!isOpen && !isMobile) toggleSidebar();
                  }}
                  title={group.category}
                >
                  <Icon icon={group.icon} className="h-5 w-5 text-gray-400 group-hover:text-[#f05d23] transition-colors" />
                </div>
              )}

              <AnimatePresence initial={false}>
                {expandedCategories[group.category] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <ul className={`${isOpen ? "pl-2" : "pl-0"} mt-1 flex flex-col gap-1`}>
                      {group.items.map(({ href, icon, label }, itemIndex) => {
                        const active = isActive(href);
                        return (
                          <motion.li
                            key={href}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: itemIndex * 0.03, ease: "easeOut" }}
                          >
                            <motion.div
                              onClick={() => {
                                router.push(href);
                                if (isMobile) toggleSidebar();
                              }}
                              onMouseEnter={() => {
                                if (!isOpen && !isMobile) toggleSidebar();
                              }}
                              title={!isOpen ? label : undefined}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ${
                                active
                                  ? "bg-[#f05d23]/10 text-[#f05d23]"
                                  : mode === "dark"
                                    ? "text-gray-400 hover:bg-white/5 hover:text-white"
                                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                              } ${!isOpen ? "justify-center" : ""}`}
                            >
                              {active && <div className="absolute left-0 w-1 h-1/2 bg-[#f05d23] rounded-r-full" />}
                              <Icon icon={icon} className={`h-4 w-4 shrink-0 transition-all duration-300 ${active ? "scale-105" : "group-hover:scale-110"}`} />
                              {isOpen && <span className="flex-1 truncate">{label}</span>}
                              {isOpen && NAV_SHORTCUTS[href] && (
                                <span
                                  className={`hidden font-mono text-[10px] uppercase tracking-wide group-hover:inline ${
                                    active ? "text-[#f05d23]/70" : "text-gray-400 dark:text-gray-500"
                                  }`}
                                >
                                  G {NAV_SHORTCUTS[href]}
                                </span>
                              )}
                            </motion.div>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {isOpen && (
          <div className="px-4 pb-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
            <kbd className={`rounded border px-1 py-0.5 ${mode === "dark" ? "border-white/10" : "border-gray-200"}`}>⌘K</kbd> to search
          </div>
        )}

        {!(!isOpen && isMobile) && (
          <SidebarUserMenu mode={mode} user={user} loading={loading} isOpen={isOpen} isMobile={isMobile} onLogout={onLogout} />
        )}
      </div>
    </div>
  );
}
