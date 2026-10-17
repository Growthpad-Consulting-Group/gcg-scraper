"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { cn } from "@/shared/lib/cn";

export type KpiAccent = "orange" | "amber" | "blue" | "green";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: string;
  accent: KpiAccent;
  href?: string;
  sub?: string;
  loading?: boolean;
}

const ACCENT: Record<KpiAccent, { icon: string; value: string; sub: string }> = {
  orange: {
    icon: "bg-brand-500/15 text-brand-500",
    value: "text-brand-500",
    sub: "text-brand-500/60",
  },
  amber: {
    icon: "bg-status-warning/15 text-status-warning",
    value: "text-status-warning",
    sub: "text-status-warning/60",
  },
  blue: {
    icon: "bg-status-info/15 text-status-info",
    value: "text-status-info",
    sub: "text-status-info/60",
  },
  green: {
    icon: "bg-status-success/15 text-status-success",
    value: "text-status-success",
    sub: "text-status-success/60",
  },
};

function CardInner({ label, value, icon, accent, sub, loading }: Omit<KpiCardProps, "href">) {
  const colors = ACCENT[accent];
  return (
    <div className="flex items-center gap-4">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", colors.icon)}>
        <Icon icon={icon} width={22} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="mb-1 h-7 w-16 animate-pulse rounded-md bg-surface-2" />
        ) : (
          <div className={cn("font-mono text-2xl font-bold leading-none", colors.value)}>{value}</div>
        )}
        <div className="mt-1 text-xs font-medium text-text-lo">{label}</div>
        {sub && !loading && <div className={cn("mt-0.5 font-mono text-[11px]", colors.sub)}>{sub}</div>}
      </div>
    </div>
  );
}

export default function KpiCard(props: KpiCardProps) {
  const base =
    "group relative rounded-xl border border-app-border bg-surface p-4 transition-all hover:border-brand-500/30 hover:shadow-sm";

  if (props.href) {
    return (
      <Link href={props.href} className={cn(base, "block")}>
        <CardInner {...props} />
      </Link>
    );
  }

  return (
    <div className={base}>
      <CardInner {...props} />
    </div>
  );
}
