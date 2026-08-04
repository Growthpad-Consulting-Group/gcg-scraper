import { cn } from "@/shared/lib/cn";

export type BadgeStatus = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  success: "text-status-success border-status-success/30 bg-status-success/10",
  warning: "text-status-warning border-status-warning/30 bg-status-warning/10",
  danger: "text-status-danger border-status-danger/30 bg-status-danger/10",
  info: "text-status-info border-status-info/30 bg-status-info/10",
  neutral: "text-text-lo border-app-border bg-surface-2",
};

interface BadgeProps {
  status?: BadgeStatus;
  children: React.ReactNode;
  className?: string;
}

/** Monospace uppercase status/source pill, e.g. `[ OPEN ]`, `[ TENDERS.GO.KE ]`. */
export default function Badge({ status = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        STATUS_CLASSES[status],
        className
      )}
    >
      [&nbsp;{children}&nbsp;]
    </span>
  );
}
