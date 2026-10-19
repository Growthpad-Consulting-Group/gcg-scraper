"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Badge from "@/shared/ui/Badge";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface SourceHealth {
  tender_type: string;
  last_run_at: string;
  last_tender_count: number;
  last_status: "done" | "error";
  consecutive_zero_runs: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusFor(row: SourceHealth): "danger" | "warning" | "success" {
  if (row.last_status === "error") return "danger";
  if (row.consecutive_zero_runs >= 2) return "warning";
  const hoursSince = (Date.now() - new Date(row.last_run_at).getTime()) / 3600000;
  if (hoursSince > 72) return "warning";
  return "success";
}

function statusLabel(row: SourceHealth): string {
  if (row.last_status === "error") return "error";
  if (row.consecutive_zero_runs >= 2) return `${row.consecutive_zero_runs} empty runs`;
  const hoursSince = (Date.now() - new Date(row.last_run_at).getTime()) / 3600000;
  if (hoursSince > 72) return "stale";
  return "healthy";
}

export default function SourceHealthPanel() {
  const { resolvedMode: mode } = useTheme();
  const [rows, setRows] = useState<SourceHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/source-health");
      const data = await res.json();
      setRows(data.sources ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const issues = rows.filter((r) => statusFor(r) !== "success").length;
  const healthy = rows.length - issues;

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-5 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gcg-orange to-gcg-orange-dark shadow-lg shadow-gcg-orange/30">
            <Icon icon="solar:pulse-broken" width={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-hi">Source Health</p>
            <p className="text-xs text-text-lo">Last run time and tender count per scrape source</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rows.length > 0 && (
            <span className="hidden text-xs text-text-lo sm:block">
              {healthy} healthy{issues > 0 ? `, ${issues} need attention` : ""}
            </span>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-app-border bg-surface px-2.5 py-1.5 text-xs text-text-lo transition-colors hover:border-brand-500/30 hover:text-brand-500 disabled:opacity-50"
          >
            <Icon icon="solar:refresh-broken" width={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Icon icon="solar:pulse-broken" width={28} className="text-text-lo opacity-40" />
          <p className="text-sm text-text-lo">No data yet — source health is recorded after the first scrape run.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const s = statusFor(row);
            return (
              <div
                key={row.tender_type}
                className="flex flex-col gap-2 rounded-xl border border-app-border bg-canvas/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text-hi">{row.tender_type}</span>
                  <Badge status={s}>{statusLabel(row)}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-text-lo">
                  <span className="flex items-center gap-1">
                    <Icon icon="solar:clock-broken" width={11} />
                    {timeAgo(row.last_run_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon icon="solar:document-text-broken" width={11} />
                    {row.last_tender_count} tender{row.last_tender_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
