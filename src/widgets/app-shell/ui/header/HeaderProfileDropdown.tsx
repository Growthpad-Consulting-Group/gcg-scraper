"use client";

import { FC, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import type { UserProfile } from "@/features/auth/hooks/useUserProfile";

interface HeaderProfileDropdownProps {
  mode: "light" | "dark";
  user: UserProfile | null;
  loading: boolean;
  onLogout: () => void;
}

const HeaderProfileDropdown: FC<HeaderProfileDropdownProps> = ({ mode, user, loading, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpen = () => {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    setIsOpen((o) => !o);
  };

  const displayName = loading ? "Loading..." : user?.name || "GCG BD Team";

  return (
    <div className="flex items-center gap-2 relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title={isOpen ? "Close Profile" : "Open Profile"}
        className="relative z-2 flex items-center justify-center p-2 rounded-full transition-all active:scale-95 group hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-100"
      >
        <Icon icon="solar:user-circle-broken" className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
      </button>

      {isOpen && rect && typeof document !== "undefined" &&
        createPortal(
          <div ref={dropdownRef} style={{ position: "fixed", top: rect.bottom + 8, right: window.innerWidth - rect.right, zIndex: 9999, width: 320 }}>
            <GlassPanel mode={mode} className="rounded-2xl">
              <div className="p-4">
                <div className="flex items-center gap-2 w-full px-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                    <Icon icon="solar:user-circle-broken" className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-md font-semibold truncate ${mode === "dark" ? "text-white" : "text-black"}`}>{displayName}</span>
                    {user?.email && <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</span>}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className={`flex items-center w-full gap-2 border-t h-10 font-medium text-sm transition-colors rounded-lg p-2 mt-2 ${
                    mode === "dark" ? "text-red-400 hover:text-red-300 hover:bg-white/5 border-white/10" : "text-red-500 hover:text-red-600 hover:bg-red-50/50 border-white/30"
                  }`}
                >
                  <Icon icon="solar:logout-broken" className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </GlassPanel>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HeaderProfileDropdown;
