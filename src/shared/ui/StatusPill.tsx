import { memo } from "react";
import { Icon } from "@iconify/react";

// ---------------------------------------------------------------------------
// Status configurations — scoped to gcg-scraper domain only
// ---------------------------------------------------------------------------

const STATUS_CONFIGS = {
  // Scrape job statuses (scrape_jobs.status)
  job: {
    queued: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-800/50",
      icon: "solar:clock-circle-broken",
      label: "Queued",
    },
    running: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-100 dark:border-blue-800/50",
      icon: "solar:refresh-broken",
      label: "Running",
    },
    done: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-800/50",
      icon: "solar:check-circle-broken",
      label: "Done",
    },
    error: {
      bg: "bg-rose-50 dark:bg-rose-900/30",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-100 dark:border-rose-800/50",
      icon: "solar:close-circle-broken",
      label: "Error",
    },
    canceled: {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:minus-circle-broken",
      label: "Canceled",
    },
  },

  // Generic active/inactive (websites, tasks, etc.)
  default: {
    active: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-800/50",
      icon: "solar:check-circle-broken",
      label: "Active",
    },
    inactive: {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:minus-circle-broken",
      label: "Inactive",
    },
    enabled: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-800/50",
      icon: "solar:check-circle-broken",
      label: "Enabled",
    },
    disabled: {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:minus-circle-broken",
      label: "Disabled",
    },
    pending: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-800/50",
      icon: "solar:clock-circle-broken",
      label: "Pending",
    },
    // Generic job statuses when context="default"
    queued: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-800/50",
      icon: "solar:clock-circle-broken",
      label: "Queued",
    },
    running: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-100 dark:border-blue-800/50",
      icon: "solar:refresh-broken",
      label: "Running",
    },
    done: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-800/50",
      icon: "solar:check-circle-broken",
      label: "Done",
    },
    error: {
      bg: "bg-rose-50 dark:bg-rose-900/30",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-100 dark:border-rose-800/50",
      icon: "solar:close-circle-broken",
      label: "Error",
    },
    canceled: {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:minus-circle-broken",
      label: "Canceled",
    },
    "n/a": {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:question-circle-broken",
      label: "N/A",
    },
  },

  // Boolean yes/no fields
  boolean: {
    true: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-800/50",
      icon: "solar:check-circle-broken",
      label: "Yes",
    },
    false: {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:close-circle-broken",
      label: "No",
    },
    "n/a": {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:question-circle-broken",
      label: "N/A",
    },
  },

  // Notification read/unread
  notification: {
    read: {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:letter-opened-broken",
      label: "Read",
    },
    unread: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-100 dark:border-blue-700/30",
      icon: "solar:letter-broken",
      label: "Unread",
    },
  },

  // Priority levels (used on scheduled tasks / tenders)
  priority: {
    high: {
      bg: "bg-rose-50 dark:bg-rose-900/30",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-100 dark:border-rose-800/50",
      icon: "solar:danger-circle-broken",
      label: "High",
    },
    medium: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-800/50",
      icon: "solar:danger-broken",
      label: "Medium",
    },
    low: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-100 dark:border-blue-700/30",
      icon: "solar:info-circle-broken",
      label: "Low",
    },
    "n/a": {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-100 dark:border-gray-700",
      icon: "solar:question-circle-broken",
      label: "N/A",
    },
  },
};

// Default fallback for unrecognised status values
const DEFAULT_CONFIG = {
  bg: "bg-gray-50 dark:bg-gray-800",
  text: "text-gray-600 dark:text-gray-400",
  border: "border-gray-100 dark:border-gray-700",
  icon: "solar:question-circle-broken",
  label: "Unknown",
};

interface StatusPillProps {
  status: string | boolean | null | undefined;
  /**
   * Which context group to look up:
   *   "default"      — generic active/inactive/job statuses (fallback)
   *   "job"          — scrape_jobs: queued/running/done/error/canceled
   *   "boolean"      — true/false → Yes/No
   *   "notification" — read/unread
   *   "priority"     — high/medium/low
   *
   * Any unknown string falls back to "default" gracefully.
   */
  context?: string;
  showIcon?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "outlined" | "solid";
  customLabel?: string;
  /** @deprecated kept for API compatibility — dark mode applied via Tailwind dark: classes */
  mode?: "light" | "dark";
}

const StatusPill = memo(function StatusPill({
  status,
  context = "default",
  showIcon = true,
  size = "sm",
  variant = "default",
  customLabel,
}: StatusPillProps) {
  // Normalise the incoming value
  let normalizedStatus = "";
  let resolvedContext = context as keyof typeof STATUS_CONFIGS;

  if (typeof status === "boolean") {
    normalizedStatus = status.toString();
    resolvedContext = "boolean";
  } else if (status !== null && status !== undefined) {
    normalizedStatus = status.toString().toLowerCase().trim();
  }

  // Fall back to "default" if the context string doesn't match any known group
  const contextConfig =
    (STATUS_CONFIGS[resolvedContext] ?? STATUS_CONFIGS.default) as Record<string, typeof DEFAULT_CONFIG>;
  const config: typeof DEFAULT_CONFIG = contextConfig[normalizedStatus] ?? DEFAULT_CONFIG;

  const sizeClasses: Record<string, { container: string; icon: string; gap: string }> = {
    xs: { container: "px-2 py-0.5 text-[9px] font-bold tracking-tight", icon: "w-2.5 h-2.5", gap: "gap-1" },
    sm: { container: "px-2.5 py-1 text-xs font-bold", icon: "w-3 h-3", gap: "gap-1.5" },
    md: { container: "px-3 py-1.5 text-sm font-medium", icon: "w-4 h-4", gap: "gap-2" },
    lg: { container: "px-4 py-2 text-base font-bold", icon: "w-5 h-5", gap: "gap-2.5" },
  };

  const sizeConfig = sizeClasses[size] ?? sizeClasses.sm;

  const variantClass: Record<string, string> = {
    default: `${config.bg} ${config.text} ${config.border} border`,
    solid: `${config.bg.replace(/50/g, "500").replace(/900\/30/g, "600")} text-white border-transparent`,
    outlined: `bg-transparent ${config.text} ${config.border} border-2`,
  };

  const displayLabel = customLabel ?? config.label;

  return (
    <span
      className={`inline-flex items-center ${sizeConfig.gap} ${sizeConfig.container} rounded-xl font-bold tracking-wide shadow-xs border transition-all duration-200 hover:scale-105 active:scale-95 ${variantClass[variant] ?? variantClass.default}`}
      title={displayLabel}
    >
      {showIcon && (
        <Icon icon={config.icon} className={sizeConfig.icon} aria-hidden="true" />
      )}
      <span>{displayLabel}</span>
    </span>
  );
});

export default StatusPill;
