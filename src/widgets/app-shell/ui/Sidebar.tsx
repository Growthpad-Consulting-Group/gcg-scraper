"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { sidebarNav } from "@/shared/lib/nav";

export default function Sidebar({
  isOpen,
  mode,
  onLogout,
  toggleSidebar,
  fullName = "GCG BD Team",
}: {
  isOpen: boolean;
  mode: "light" | "dark";
  onLogout: () => void;
  toggleSidebar: () => void;
  fullName?: string;
}) {
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  if (windowWidth === null) return null;

  const isActive = (href: string) =>
    pathname === href
      ? "bg-[#f05d23] text-white shadow-md"
      : mode === "dark"
      ? "text-gray-200 hover:bg-gray-700 hover:text-white"
      : "text-[#231812] hover:bg-gray-200 hover:text-[#f05d23]";

  return (
    <div
      ref={sidebarRef}
      className={`fixed left-0 top-0 z-50 h-full transition-all duration-300 ${mode === "dark" ? "bg-gray-900" : "bg-gray-50"}`}
      style={{ width: isOpen ? "300px" : windowWidth < 640 ? "0" : "80px" }}
    >
      <div className="flex flex-col h-full">
        <div className={`flex justify-left py-8 ${isOpen ? "px-6" : "px-0"}`}>
          {isOpen ? (
            <Image
              src={mode === "dark" ? "/assets/images/logo-white.svg" : "/assets/images/logo.svg"}
              alt="Growthpad Logo"
              width={180}
              height={75}
              className="object-contain"
            />
          ) : (
            <Image
              src={mode === "dark" ? "/favicon-white.png" : "/favicon.png"}
              alt="Growthpad Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          )}
        </div>

        <ul className="flex-grow px-2">
          {sidebarNav.map(({ href, icon, label }) => (
            <li key={href} className="py-2">
              <button
                onClick={() => {
                  router.push(href);
                  if (windowWidth < 640) toggleSidebar();
                }}
                className={`flex items-center font-semibold text-sm w-full ${
                  isOpen ? "justify-start px-6" : "justify-center px-0"
                } py-3 rounded-lg hover:shadow-md transition-all duration-200 group relative ${isActive(href)}`}
              >
                <Icon icon={icon} className={`${isOpen ? "h-7 w-7 mr-3" : "h-6 w-6"} group-hover:scale-110 transition-transform`} />
                {isOpen && <span className="text-base">{label}</span>}
                {!isOpen && (
                  <span
                    className={`absolute left-full ml-2 text-xs ${
                      mode === "dark" ? "bg-gray-800 text-gray-200" : "bg-gray-700 text-white"
                    } rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50`}
                  >
                    {label}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {!isOpen && windowWidth < 640 ? null : (
          <div
            className={`flex items-center justify-between px-4 py-3 mt-auto ${
              mode === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-700" : "bg-gradient-to-r from-gray-200 to-gray-100"
            } shadow-inner`}
          >
            {isOpen ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 overflow-hidden">
                    <Image src={mode === "dark" ? "/favicon-white.png" : "/favicon.png"} alt="Profile" width={48} height={48} className="object-cover" />
                  </div>
                  <span className={`text-base font-medium ${mode === "dark" ? "text-gray-200" : "text-[#231812]"}`}>{fullName}</span>
                </div>
                <button onClick={onLogout} className="flex items-center justify-center text-red-500 hover:text-red-600 transition-colors" aria-label="Logout">
                  <ArrowRightStartOnRectangleIcon className="h-7 w-7" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full relative group">
                <button onClick={onLogout} className="flex items-center justify-center text-red-500 hover:text-red-600 transition-colors" aria-label="Logout">
                  <ArrowRightStartOnRectangleIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </button>
                <span
                  className={`absolute left-full ml-2 text-xs ${
                    mode === "dark" ? "bg-gray-800 text-gray-200" : "bg-gray-700 text-white"
                  } rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50`}
                >
                  Sign Out
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
