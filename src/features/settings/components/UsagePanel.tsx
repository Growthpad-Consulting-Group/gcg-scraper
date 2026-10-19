"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { ProviderUsage } from "@/shared/lib/providerUsage";

// ─── helpers ─────────────────────────────────────────────────────────────────

function pct(usage: ProviderUsage) {
  return usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
}

function statusOf(usage: ProviderUsage): "danger" | "warning" | "success" {
  if (usage.error) return "danger";
  const p = pct(usage);
  if (usage.used > usage.limit && usage.limit > 0) return "danger";
  if (p >= 90) return "danger";
  if (p >= 70) return "warning";
  return "success";
}

function resetLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Resets today";
  if (days === 1) return "Resets tomorrow";
  return `Resets in ${days}d`;
}

function formatNum(n: number, unit: ProviderUsage["unit"]) {
  if (unit === "USD") return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function unitLabel(unit: ProviderUsage["unit"]) {
  return unit === "USD" ? "" : " credits";
}

// ─── Provider card ────────────────────────────────────────────────────────────

const PROVIDER_META: Record<string, { icon: string; label: string; color: string }> = {
  firecrawl: {
    icon: "solar:fire-broken",
    label: "Firecrawl",
    color: "from-orange-500 to-red-500",
  },
  apify: {
    icon: "solar:widget-broken",
    label: "Apify",
    color: "from-sky-500 to-blue-600",
  },
};

function ProviderCard({ provider, rows }: { provider: string; rows: ProviderUsage[] }) {
  const meta = PROVIDER_META[provider] ?? {
    icon: "solar:server-broken",
    label: provider,
    color: "from-slate-500 to-slate-600",
  };

  const worstStatus = rows.reduce<"success" | "warning" | "danger">((acc, r) => {
    const s = statusOf(r);
    if (s === "danger") return "danger";
    if (s === "warning" && acc !== "danger") return "warning";
    return acc;
  }, "success");

  const totalUsed = rows.reduce((s, r) => s + (r.error ? 0 : r.used), 0);
  const totalLimit = rows.reduce((s, r) => s + (r.error ? 0 : r.limit), 0);
  const unit = rows[0]?.unit ?? "credits";
  const aggPct = totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0;
  const hasError = rows.some((r) => r.error);

  const barColor =
    worstStatus === "danger"
      ? "from-status-danger to-red-400"
      : worstStatus === "warning"
      ? "from-status-warning to-amber-400"
      : "from-status-success to-emerald-400";

  // Earliest reset among all keys
  const nextReset = rows
    .map((r) => r.periodEnd)
    .filter(Boolean)
    .sort()[0] ?? null;
  const reset = resetLabel(nextReset);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-app-border bg-surface/60 p-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} shadow-md`}
          >
            <Icon icon={meta.icon} width={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-hi">{meta.label}</p>
            <p className="text-xs text-text-lo">{rows.length} key{rows.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {hasError ? (
          <Badge status="danger">error</Badge>
        ) : (
          <Badge status={worstStatus}>{aggPct}%</Badge>
        )}
      </div>

      {/* Aggregate bar */}
      {!hasError && totalLimit > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all ${barColor}`}
              style={{ width: `${aggPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-lo">
            <span>
              <span className="font-medium text-text-hi">{formatNum(totalUsed, unit)}</span>
              {unitLabel(unit)} of{" "}
              <span className="font-medium text-text-hi">{formatNum(totalLimit, unit)}</span>
              {unitLabel(unit)}
            </span>
            {reset && <span className="shrink-0">{reset}</span>}
          </div>
        </div>
      )}

      {/* Per-key breakdown — compact pill list */}
      {rows.length > 1 && (
        <div className="flex flex-col gap-1.5 border-t border-app-border pt-3">
          {rows.map((r) => {
            const p = pct(r);
            const s = statusOf(r);
            const isSubKey = r.label.includes("fallback");
            const keyName = r.label.includes("—") ? r.label.split("—")[1].trim() : r.label;
            const pillBar =
              s === "danger"
                ? "bg-status-danger/20 text-status-danger"
                : s === "warning"
                ? "bg-status-warning/20 text-status-warning"
                : "bg-status-success/15 text-status-success";

            return (
              <div key={r.label} className="flex items-center gap-2 text-xs">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  isSubKey
                    ? "border-app-border text-text-lo"
                    : "border-brand-500/40 text-brand-500"
                }`}>
                  {isSubKey ? keyName : "primary"}
                </span>
                {r.error ? (
                  <span className="text-status-danger truncate">{r.error}</span>
                ) : (
                  <>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          s === "danger" ? "bg-status-danger" : s === "warning" ? "bg-status-warning" : "bg-status-success"
                        }`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${pillBar}`}>
                      {r.used > r.limit && r.limit > 0 ? "exhausted" : `${p}%`}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Single-key error state */}
      {rows.length === 1 && rows[0].error && (
        <p className="text-xs text-status-danger leading-snug border-t border-app-border pt-3">
          {rows[0].error} — key may be invalid or revoked
        </p>
      )}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

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

  useEffect(() => { load(); }, []);

  // Group by provider
  const groups = usage.reduce<Record<string, ProviderUsage[]>>((acc, u) => {
    (acc[u.provider] ??= []).push(u);
    return acc;
  }, {});

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-6 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gcg-orange to-gcg-orange-dark shadow-lg shadow-gcg-orange/30">
            <Icon icon="solar:chart-2-broken" width={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-hi">Provider Usage</p>
            <p className="text-xs text-text-lo">
              Credit and spend across every configured key — an account running low shows up here before it surfaces as a failed job.
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={isLoading} title="Refresh">
          <Icon icon="solar:refresh-broken" width={14} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl border border-app-border p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-surface-2" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-surface-2" />
                  <div className="h-3 w-14 animate-pulse rounded bg-surface-2" />
                </div>
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-surface-2" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-2" />
            </div>
          ))}
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Icon icon="solar:plug-circle-broken" width={28} className="text-text-lo" />
          <p className="text-sm text-text-lo">No Firecrawl or Apify keys configured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(groups).map(([provider, rows]) => {
            const order = { success: 0, warning: 1, danger: 2 };
            const sorted = [...rows].sort((a, b) => order[statusOf(a)] - order[statusOf(b)]);
            return <ProviderCard key={provider} provider={provider} rows={sorted} />;
          })}
        </div>
      )}
    </GlassPanel>
  );
}
