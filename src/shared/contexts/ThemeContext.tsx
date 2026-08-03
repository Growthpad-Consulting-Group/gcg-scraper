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
  typeof window === "undefined" ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const resolveTheme = (theme: Theme): DisplayMode => (theme === "system" ? getSystemPreference() : theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Theme>("system");
  const [resolvedMode, setResolvedMode] = useState<DisplayMode>("light");

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      setMode(savedTheme);
    } else {
      setMode("system");
    }
  }, []);

  // Resolve + apply whenever the raw mode changes
  useEffect(() => {
    const resolved = resolveTheme(mode);
    setResolvedMode(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    localStorage.setItem("theme", mode);
  }, [mode]);

  // Track system preference changes while in "system" mode
  useEffect(() => {
    if (mode !== "system") return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolved = resolveTheme("system");
      setResolvedMode(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  return <ThemeContext.Provider value={{ mode, resolvedMode, setMode, toggleMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
