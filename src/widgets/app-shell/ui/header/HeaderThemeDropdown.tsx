"use client";

import { FC, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useTheme } from "@/shared/contexts/ThemeContext";
import GlassPanel from "@/shared/ui/GlassPanel";

interface HeaderThemeDropdownProps {
  mode: "light" | "dark" | "system";
  resolvedMode: "light" | "dark";
}

const THEME_OPTIONS = [
  { value: "light", icon: "solar:sun-2-broken", tooltip: "Light Mode" },
  { value: "system", icon: "solar:monitor-broken", tooltip: "System Default" },
  { value: "dark", icon: "solar:moon-broken", tooltip: "Dark Mode" },
] as const;

const HeaderThemeDropdown: FC<HeaderThemeDropdownProps> = ({ mode, resolvedMode }) => {
  const { setMode } = useTheme();
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

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title={`Theme: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
        className="relative z-2 flex items-center justify-center p-2 rounded-full transition-all active:scale-95 group hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-100"
      >
        <Icon
          icon={mode === "light" ? "solar:sun-2-broken" : mode === "dark" ? "solar:moon-broken" : "solar:monitor-broken"}
          className={`h-5 w-5 transition-all duration-500 ${isOpen ? "rotate-12 scale-110" : "group-hover:scale-110"}`}
        />
      </button>

      {isOpen && rect && typeof document !== "undefined" &&
        createPortal(
          <div ref={dropdownRef} style={{ position: "fixed", top: rect.bottom + 8, right: window.innerWidth - rect.right, zIndex: 9999 }}>
            <GlassPanel mode={resolvedMode} className="p-2 rounded-2xl">
              <div className="px-1 py-1">
                <div className="flex backdrop-blur-sm bg-white/10 dark:bg-white/5 border border-white/20 p-1 rounded-xl gap-1">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => {
                        setMode(theme.value);
                        setTimeout(() => setIsOpen(false), 200);
                      }}
                      title={theme.tooltip}
                      className={`flex items-center justify-center transition-all rounded-lg w-10 h-10 ${
                        mode === theme.value
                          ? "bg-white/40 dark:bg-white/20 text-[#f05d23] dark:text-white shadow-md ring-1 ring-inset ring-white/30"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10"
                      }`}
                    >
                      <Icon icon={theme.icon} className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HeaderThemeDropdown;
