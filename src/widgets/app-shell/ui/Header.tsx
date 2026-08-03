"use client";

import { useState, useEffect, useRef } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/16/solid";
import Notifications from "@/shared/components/Notifications";
import type { Notification } from "@/shared/contexts/NotificationsContext";

export default function Header({
  mode,
  toggleSidebar,
  toggleMode,
  isSidebarOpen,
  onLogout,
  pageName = "Dashboard",
  pageDescription = "",
  fullName = "GCG BD Team",
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
  pageName?: string;
  pageDescription?: string;
  fullName?: string;
  loading?: boolean;
  notifications?: Notification[];
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (headerRef.current) {
      document.body.style.paddingTop = `${headerRef.current.offsetHeight}px`;
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 mb-6 content-container transition-all duration-300 shadow-sm ${
        mode === "dark" ? "border-[#f05d23] bg-[#101827] text-white bg-opacity-100" : "border-gray-300 bg-[#ececec] text-black bg-opacity-50"
      } ${isSidebarOpen ? "md:ml-[300px]" : "md:ml-[80px]"} backdrop-blur-md`}
    >
      <div className="flex items-center justify-between p-0 md:p-4">
        <div className="flex items-center space-x-2">
          <button onClick={toggleSidebar} className="p-2 focus:outline-none" aria-label="Toggle sidebar">
            {isSidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
          <div className="flex flex-col">
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${mode === "dark" ? "text-white" : "text-[#231812]"}`}>
              {pageName}
            </h1>
            {pageDescription && (
              <p className={`text-base truncate max-w-[200px] md:max-w-[500px] ${mode === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {pageDescription}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-6">
          <button onClick={toggleMode} className="p-2 focus:outline-none md:hidden" aria-label="Toggle dark mode">
            {mode === "dark" ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
          </button>

          <div className="relative cursor-pointer" ref={notificationsRef} onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
            <div className="p-2 focus:outline-none cursor-pointer relative">
              <Icon icon="mdi:bell-outline" width={24} height={24} className={`text-[#f05d23] ${unreadCount > 0 ? "animate-pulse" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white rounded-full text-xs px-2 py-1">{unreadCount}</span>
              )}
            </div>
            {isNotificationsOpen && (
              <div
                className={`absolute top-12 right-0 w-96 rounded-2xl shadow-lg z-10 ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Notifications notifications={notifications} mode={mode} isLoading={isLoading} onMarkAsRead={onMarkAsRead} onClearAll={onClearAll} />
              </div>
            )}
          </div>

          <label className="hidden md:inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={mode === "dark"} onChange={toggleMode} className="hidden" />
            <div className={`relative w-14 h-8 rounded-full border-2 flex items-center ${mode === "dark" ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-gray-300"} transition`}>
              <div className={`absolute w-6 h-6 rounded-full bg-white flex items-center justify-center transition-transform ${mode === "dark" ? "translate-x-6" : ""}`}>
                {mode === "dark" ? <Icon icon="bi:moon" className="h-4 w-4 text-gray-700" /> : <Icon icon="bi:sun" className="h-4 w-4 text-yellow-500" />}
              </div>
            </div>
          </label>

          <div className="flex items-center gap-2 relative group cursor-default" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 overflow-hidden">
                <Image src={mode === "dark" ? "/favicon-white.png" : "/favicon.png"} alt="User Profile" width={40} height={40} className="object-cover" />
              </div>
              <div className="hidden md:block">
                <span className={`font-bold ${mode === "dark" ? "text-white" : "text-[#231812]"}`}>{loading ? "Loading..." : fullName}</span>
                <span className="block text-sm font-normal text-[#f05d23]">Business Department</span>
              </div>
              <Icon
                icon={dropdownOpen ? "mingcute:arrow-up-fill" : "mingcute:arrow-down-fill"}
                className={`h-5 w-5 font-bold transform transition-transform duration-300 ${mode === "dark" ? "text-white" : "text-[#231812]"}`}
              />
            </div>

            {dropdownOpen && (
              <div className={`absolute top-full mt-2 right-0 w-80 rounded-2xl shadow-lg z-10 ${mode === "dark" ? "bg-gray-800 text-white" : "bg-white text-[#231812]"}`}>
                <div className="p-8">
                  <p className="text-lg mb-6">User Profile</p>
                  <div className="flex items-center gap-2 border-b pb-6 w-full">
                    <div className="overflow-hidden flex-shrink-0">
                      <Image src={mode === "dark" ? "/favicon-white.png" : "/favicon.png"} alt="User Profile" width={40} height={40} className="object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-md font-bold">{loading ? "Loading..." : fullName}</span>
                      <span className="text-sm">Business Department</span>
                    </div>
                  </div>
                  <button onClick={onLogout}>Logout</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
