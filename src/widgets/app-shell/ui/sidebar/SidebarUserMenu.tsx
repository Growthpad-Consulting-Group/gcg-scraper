"use client";

import { FC, useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { UserProfile } from "@/features/auth/hooks/useUserProfile";

interface SidebarUserMenuProps {
  mode: "light" | "dark";
  user: UserProfile | null;
  loading: boolean;
  isOpen: boolean;
  isMobile: boolean;
  onLogout: () => void;
}

const SidebarUserMenu: FC<SidebarUserMenuProps> = ({ mode, user, loading, isOpen, isMobile, onLogout }) => {
  const { mode: themeMode, setMode } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = loading ? "Loading..." : user?.name || "GCG BD Team";

  const handleToggleTheme = () => {
    if (themeMode === "light") setMode("dark");
    else if (themeMode === "dark") setMode("system");
    else setMode("light");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMenu(false);
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu]);

  return (
    <div ref={menuRef} className="px-3 py-4 mt-auto  bg-transparent">
      <div
        className={`flex items-center space-x-3 cursor-pointer rounded-xl p-2.5 transition-all duration-300 border-t border-[#f05d23] ${
          mode === "dark" ? "hover:bg-white/5 text-gray-300 hover:text-white" : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
        }`}
        onClick={() => setShowMenu((prev) => !prev)}
      >
        <div className="shrink-0 overflow-hidden rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-white/20 dark:border-white/10">
          <Icon icon="solar:user-circle-broken" className="h-5 w-5 text-[#f05d23]" />
        </div>
        {(isOpen || isMobile) && (
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex flex-col min-w-0">
              <span className={`text-sm font-semibold truncate ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{displayName}</span>
              {user?.email && <span className="text-[11px] text-gray-400 truncate">{user.email}</span>}
            </div>
            <Icon
              icon="solar:alt-arrow-right-broken"
              className={`w-4 h-4 transition-transform duration-300 text-gray-400 shrink-0 ${showMenu ? "rotate-90" : ""}`}
            />
          </div>
        )}
      </div>

      <div className={`transition-all duration-300 overflow-hidden ${showMenu ? "max-h-80 opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
        <div className="flex flex-col gap-1 p-1">
          <button
            onClick={handleToggleTheme}
            className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm transition-all duration-200 ${
              mode === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100/80 text-gray-600"
            }`}
          >
            <Icon
              icon={themeMode === "dark" ? "solar:sun-2-broken" : themeMode === "light" ? "solar:moon-broken" : "solar:monitor-broken"}
              className={`h-5 w-5 ${themeMode === "dark" ? "text-yellow-400" : themeMode === "system" ? "" : "text-[#f05d23]"}`}
            />
            <span className="capitalize">{themeMode === "system" ? "System Mode" : `${themeMode} Mode`}</span>
          </button>

          <div className="my-1 h-px bg-white/10 dark:bg-white/5" />

          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-red-500 hover:bg-red-500/10"
          >
            <Icon icon="solar:logout-broken" className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarUserMenu;
