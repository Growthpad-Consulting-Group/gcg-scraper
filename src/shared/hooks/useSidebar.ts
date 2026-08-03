"use client";

import { useState, useEffect } from "react";

export default function useSidebar() {
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getInitialSidebarState = () => {
    if (typeof window === "undefined") return false;
    const savedState = localStorage.getItem("sidebarOpen");
    return savedState !== null ? JSON.parse(savedState) : window.innerWidth > 768;
  };

  useEffect(() => {
    setSidebarOpen(getInitialSidebarState());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isSidebarOpen !== null) {
      localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return { isSidebarOpen, toggleSidebar, isLoading };
}
