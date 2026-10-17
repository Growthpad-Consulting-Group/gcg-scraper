"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { cn } from "@/shared/lib/cn";
import type { AlertItem, AlertSeverity } from "@/features/overview/lib/dashboardStats";

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: string; colors: string; dot: string }> = {
  error: {
    icon: "solar:close-circle-broken",
    colors: "text-status-danger bg-status-danger/10 border-status-danger/20",
    dot: "bg-status-danger",
  },
  warning: {
    icon: "solar:danger-triangle-broken",
    colors: "text-status-warning bg-status-warning/10 border-status-warning/20",
    dot: "bg-status-warning",
  },
  info: {
    icon: "solar:info-circle-broken",
    colors: "text-status-info bg-status-info/10 border-status-info/20",
    dot: "bg-status-info",
  },
};

interface Props {
  alerts: AlertItem[];
  loading?: boolean;
}

function SkeletonAlert() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-app-border p-3">
      <div className="mt-0.5 h-7 w-7 animate-pulse rounded-lg bg-surface-2" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 animate-pulse rounded bg-surface-2" />
        <div className="h-2.5 w-20 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

export default function AlertsFeed({ alerts, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <SkeletonAlert />
        <SkeletonAlert />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-success/10">
          <Icon icon="solar:check-circle-broken" width={20} className="text-status-success" />
        </div>
        <p className="text-xs font-medium text-text-hi">All clear</p>
        <p className="text-xs text-text-lo">No failed runs or rejected candidates</p>
      </div>
    );
  }

  return (
    <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-0.5">
      {alerts.map((alert) => {
        const cfg = SEVERITY_CONFIG[alert.severity];
        const cardClass = "flex items-start gap-3 rounded-lg border border-app-border bg-surface p-3 transition-colors hover:bg-surface-2";
        const inner = (
          <>
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", cfg.colors)}>
              <Icon icon={cfg.icon} width={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-text-hi">{alert.title}</p>
              <p className="text-[11px] text-text-lo">{alert.meta}</p>
              {alert.detail && (
                <p className="mt-0.5 truncate font-mono text-[10px] text-text-lo/70">{alert.detail}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {alert.href && <Icon icon="solar:arrow-right-broken" width={12} className="text-text-lo/40" />}
              <div className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", cfg.dot)} />
            </div>
          </>
        );
        return alert.href ? (
          <Link key={alert.id} href={alert.href} className={cardClass}>{inner}</Link>
        ) : (
          <div key={alert.id} className={cardClass}>{inner}</div>
        );
      })}
    </div>
  );
}
