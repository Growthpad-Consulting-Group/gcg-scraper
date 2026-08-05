"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type DisplayMode = "light" | "dark";

interface ThemeContextValue {
  /** Raw preference, including "system" — only the theme switcher needs this */
  mode: Theme;
  /** The actual mode being applied — what every other component should render with */
  resolvedMode: DisplayMode;
  setMode: (mode: Theme) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemPreference = (): DisplayMode =>
  typeof window === "undefined"
    ? "light"
    : window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const resolveTheme = (theme: Theme): DisplayMode =>
  theme === "system" ? getSystemPreference() : theme;

function readSavedTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialise directly from localStorage — no flash, no revert on refresh.
  const [mode, setMode] = useState<Theme>(readSavedTheme);
  const [resolvedMode, setResolvedMode] = useState<DisplayMode>(() =>
    resolveTheme(readSavedTheme())
  );

  // Apply the dark class immediately on mount (covers SSR hydration gap)
  useEffect(() => {
    const resolved = resolveTheme(mode);
    document.documentElement.classList.toggle("dark", resolved === "dark");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve + apply + persist whenever mode changes
  useEffect(() => {
    const resolved = resolveTheme(mode);
    setResolvedMode(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    localStorage.setItem("theme", mode);
  }, [mode]);

  // Track OS preference changes while in "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolved = resolveTheme("system");
      setResolvedMode(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
