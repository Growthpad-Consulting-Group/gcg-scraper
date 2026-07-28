"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { NotificationsProvider } from "@/shared/contexts/NotificationsContext";
import { sidebarNav } from "@/shared/lib/nav";

type ThemeContextValue = { mode: "light" | "dark"; toggleMode: () => void };
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within Providers");
  return ctx;
};

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  const toggleMode = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    localStorage.setItem("mode", newMode);
  };

  useEffect(() => {
    const savedMode = localStorage.getItem("mode") as "light" | "dark" | null;
    if (savedMode) {
      setMode(savedMode);
    } else {
      const systemMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setMode(systemMode);
      localStorage.setItem("mode", systemMode);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("mode")) setMode(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // App Router has no routeChangeStart/Complete events, so this fires once per
  // pathname change (post-navigation) rather than showing a loading toast first.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!pathname || pathname.startsWith("/verify")) return;

    const pageSlug = pathname.split("/").pop() || "overview";
    const page = sidebarNav.find((item) => item.href === pathname || item.href.endsWith(`/${pageSlug}`));
    const pageName = page ? page.label : pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1);

    toast.success(`${pageName} loaded`, { id: "route-success", duration: 2000 });
  }, [pathname]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <NotificationsProvider>
        <div className={mode === "dark" ? "dark" : ""}>
          <Toaster
            position="top-center"
            toastOptions={{
              success: {
                style: { background: "#4ade80", color: "#fff" },
                iconTheme: { primary: "#fff", secondary: "#4ade80" },
              },
              error: {
                style: { background: "#f87171", color: "#fff" },
                iconTheme: { primary: "#fff", secondary: "#f87171" },
              },
            }}
            reverseOrder={false}
          />
          {children}
        </div>
      </NotificationsProvider>
    </ThemeContext.Provider>
  );
}
