"use client";

import { Toaster } from "react-hot-toast";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function AppToaster() {
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  return (
    <Toaster
      position="top-right"
      gutter={12}
      containerStyle={{
        zIndex: 99999,
        top: 40,
        right: 20,
      }}
      toastOptions={{
        duration: 3000,
        style: {
          background: isDark
            ? "rgba(31, 41, 55, 0.95)"
            : "rgba(255, 255, 255, 0.75)",
          color: isDark ? "#f9fafb" : "#1b234f",
          border: isDark
            ? "1px solid rgba(75, 85, 99, 0.5)"
            : "1px solid rgba(223, 195, 140, 0.3)",
          padding: "16px 20px",
          borderRadius: "16px",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: isDark
            ? "0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(75, 85, 99, 0.3)"
            : "0 8px 32px 0 rgba(27, 35, 79, 0.12), 0 0 0 1px rgba(223, 195, 140, 0.1)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          minWidth: "320px",
        },
        success: {
          iconTheme: {
            primary: isDark ? "#10b981" : "#1b234f",
            secondary: isDark ? "#1f2937" : "#dfc38c",
          },
          style: {
            background: isDark
              ? "rgba(16, 185, 129, 0.15)"
              : "rgba(223, 195, 140, 0.15)",
            border: isDark
              ? "1px solid rgba(16, 185, 129, 0.4)"
              : "1px solid rgba(223, 195, 140, 0.4)",
            color: isDark ? "#d1fae5" : "#1b234f",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            boxShadow: isDark
              ? "0 8px 32px 0 rgba(16, 185, 129, 0.2), 0 0 0 1px rgba(16, 185, 129, 0.3)"
              : "0 8px 32px 0 rgba(27, 35, 79, 0.12), 0 0 0 1px rgba(223, 195, 140, 0.2)",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: isDark ? "#1f2937" : "white",
          },
          style: {
            background: isDark
              ? "rgba(239, 68, 68, 0.15)"
              : "rgba(254, 242, 242, 0.85)",
            border: isDark
              ? "1px solid rgba(239, 68, 68, 0.4)"
              : "1px solid rgba(239, 68, 68, 0.3)",
            color: isDark ? "#fecaca" : "#991b1b",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            boxShadow: isDark
              ? "0 8px 32px 0 rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.3)"
              : "0 8px 32px 0 rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(239, 68, 68, 0.1)",
          },
        },
        loading: {
          iconTheme: {
            primary: isDark ? "#60a5fa" : "#1b234f",
            secondary: isDark ? "#1f2937" : "#dfc38c",
          },
          style: {
            background: isDark
              ? "rgba(59, 130, 246, 0.1)"
              : "rgba(27, 35, 79, 0.08)",
            border: isDark
              ? "1px solid rgba(59, 130, 246, 0.3)"
              : "1px solid rgba(27, 35, 79, 0.2)",
            color: isDark ? "#bfdbfe" : "#1b234f",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            boxShadow: isDark
              ? "0 8px 32px 0 rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.2)"
              : "0 8px 32px 0 rgba(27, 35, 79, 0.12), 0 0 0 1px rgba(223, 195, 140, 0.2)",
          },
        },
      }}
    />
  );
}
