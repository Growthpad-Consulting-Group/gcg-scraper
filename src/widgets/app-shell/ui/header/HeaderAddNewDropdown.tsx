"use client";

import { FC, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";

export interface AddNewItem {
  label: string;
  icon: string;
  href: string;
}

interface HeaderAddNewDropdownProps {
  mode: "light" | "dark";
  items: AddNewItem[];
  onNavigate: (href: string) => void;
}

const HeaderAddNewDropdown: FC<HeaderAddNewDropdownProps> = ({ mode, items, onNavigate }) => {
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

  if (items.length === 0) return null;

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title="Add New"
        className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl transition-all duration-300 backdrop-blur-md border ring-1 ring-inset ring-white/20 shadow-sm hover:shadow-md active:scale-95 ${
          mode === "dark" ? "bg-[#f05d23]/40 border-[#f05d23]/30 text-white hover:bg-[#f05d23]/55" : "bg-[#f05d23] border-[#f05d23]/40 text-white hover:bg-[#d94f1e]"
        }`}
      >
        <Icon icon="solar:add-circle-broken" className="h-4 w-4" />
        <span className="font-semibold">Add New</span>
      </button>

      {isOpen && rect && typeof document !== "undefined" &&
        createPortal(
          <div ref={dropdownRef} style={{ position: "fixed", top: rect.bottom + 8, right: window.innerWidth - rect.right, zIndex: 9999 }}>
            <GlassPanel mode={mode} className={`w-fit max-w-[420px] rounded-xl ${mode === "dark" ? "bg-gray-900/40" : "bg-white/40"}`}>
              <div className="flex flex-wrap justify-center gap-2 p-3">
                {items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate(item.href);
                    }}
                    className={`flex w-20 flex-col items-center justify-center rounded-lg p-2 text-xs font-medium transition-all duration-200 focus:outline-none backdrop-blur-md border ring-1 ring-inset ring-white/20 ${
                      mode === "dark" ? "border-white/10 text-gray-300 hover:bg-white/10 hover:text-white" : "border-white/50 text-gray-700 hover:bg-white/60 hover:text-gray-900"
                    } hover:shadow-sm group`}
                  >
                    <span
                      className={`flex items-center justify-center h-8 w-8 rounded-full mb-1 backdrop-blur-sm border transition-all duration-200 ${
                        mode === "dark" ? "bg-white/10 border-white/10 group-hover:bg-white/15" : "bg-white/50 border-white/40 group-hover:bg-white/70"
                      }`}
                    >
                      <Icon icon={item.icon} className={`h-5 w-5 ${mode === "dark" ? "text-gray-300 group-hover:text-white" : "text-[#f05d23]"}`} />
                    </span>
                    <span className="text-xs text-center leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </GlassPanel>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HeaderAddNewDropdown;
