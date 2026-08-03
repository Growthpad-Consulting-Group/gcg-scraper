"use client";

import { Icon } from "@iconify/react";
import { ReactNode } from "react";

interface PageHeaderAction {
  label: string;
  icon?: string;
  variant?: "primary" | "secondary";
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  iconBgColor?: string;
  mode: "light" | "dark";
  actions?: PageHeaderAction[];
  children?: ReactNode;
  className?: string;
}

/** Ported from bflowpos's shared/ui/PageHeader ("enhanced" variant) — page titles live in page content, not the topbar. */
export default function PageHeader({
  title,
  description,
  icon,
  iconBgColor = "from-[#f05d23] to-[#d94f1e]",
  mode,
  actions = [],
  children,
  className = "",
}: PageHeaderProps) {
  const isDark = mode === "dark";

  return (
    <div className={`mb-6 ${className}`}>
      <div
        className={`relative rounded-2xl border shadow-xl px-6 py-5 transition-all duration-300 ease-in-out ${
          isDark ? "bg-gray-800/60 border-gray-700/60 shadow-black/20" : "bg-white border-slate-200 shadow-slate-200/50"
        }`}
      >
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`w-11 h-11 bg-gradient-to-br ${iconBgColor} rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-[#f05d23]/15`}>
                <Icon icon={icon} className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className={`text-xl font-bold leading-tight ${isDark ? "text-white" : "text-[#231812]"}`}>{title}</h1>
              {description && <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>{description}</p>}
            </div>
          </div>

          {(actions.length > 0 || children) && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {children}
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={
                    action.variant === "primary"
                      ? "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#f05d23] text-white hover:bg-[#d94f1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      : `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDark ? "border-gray-700 bg-gray-800/80 text-gray-200 hover:bg-gray-700" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`
                  }
                >
                  {action.loading ? (
                    <Icon icon="solar:loading-bold" className="w-4 h-4 animate-spin" />
                  ) : (
                    action.icon && <Icon icon={action.icon} className="w-4 h-4" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
