"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { ProviderUsage } from "@/shared/lib/providerUsage";

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "resets today";
  return `resets in ${days}d`;
}

function UsageRow({ usage }: { usage: ProviderUsage }) {
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const overLimit = usage.used > usage.limit && usage.limit > 0;
  const barColor = overLimit || pct >= 90 ? "bg-status-danger" : pct >= 70 ? "bg-status-warning" : "bg-status-success";
  const periodEnd = formatPeriodEnd(usage.periodEnd);

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-app-border bg-canvas/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-text-hi">
          <Icon icon={usage.provider === "firecrawl" ? "solar:fire-broken" : "solar:widget-broken"} width={15} className="text-text-lo" />
          {usage.label}
        </span>
        {usage.error ? (
          <Badge status="danger">unreachable</Badge>
        ) : overLimit ? (
          <Badge status="danger">exhausted</Badge>
        ) : pct >= 90 ? (
          <Badge status="danger">{pct}%</Badge>
        ) : pct >= 70 ? (
          <Badge status="warning">{pct}%</Badge>
        ) : (
          <Badge status="success">{pct}%</Badge>
        )}
      </div>

      {usage.error ? (
        <p className="text-xs text-status-danger">Couldn't fetch usage — {usage.error}. The key may be invalid or revoked.</p>
      ) : (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-text-lo">
            <span>
              {usage.used.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {usage.limit.toLocaleString()} {usage.unit}
            </span>
            {periodEnd && <span>{periodEnd}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function UsagePanel() {
  const { resolvedMode: mode } = useTheme();
  const [usage, setUsage] = useState<ProviderUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/usage");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load usage");
      setUsage(data.usage || []);
    } catch (err: any) {
      toast.error("Error loading provider usage: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gcg-orange to-gcg-orange-dark shadow-lg shadow-gcg-orange/30">
            <Icon icon="solar:chart-2-broken" width={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-hi">Provider Usage</p>
            <p className="text-xs text-text-lo">
              Firecrawl and Apify credit/spend usage across every configured key — so an account running low shows up here first, instead of as a failed job.
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={isLoading}>
          <Icon icon="solar:refresh-broken" width={14} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : usage.length === 0 ? (
        <p className="text-xs text-text-lo">No Firecrawl/Apify keys configured.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {usage.map((u) => (
            <UsageRow key={u.label} usage={u} />
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
