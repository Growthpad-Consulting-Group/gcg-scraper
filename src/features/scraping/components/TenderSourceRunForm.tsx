"use client";

import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Button from "@/shared/ui/Button";
import { useTheme } from "@/shared/contexts/ThemeContext";

export interface SourceHealth {
  tender_type: string;
  last_run_at: string | null;
  last_tender_count: number | null;
  last_status: string | null;
  consecutive_zero_runs: number | null;
}

interface Props {
  tenderTypes: string[];
  sourceHealth: SourceHealth[];
  selectedSource: string;
  onSelectSource: (s: string) => void;
  isRunning: boolean;
  onRun: () => void;
}

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function TenderSourceRunForm({ tenderTypes, sourceHealth, selectedSource, onSelectSource, isRunning, onRun }: Props) {
  const { resolvedMode: mode } = useTheme();

  const healthMap = Object.fromEntries(sourceHealth.map((s) => [s.tender_type, s]));
  const health = selectedSource ? healthMap[selectedSource] : null;

  const hoursSince = health?.last_run_at
    ? (Date.now() - new Date(health.last_run_at).getTime()) / (1000 * 60 * 60)
    : null;
  const recentlyRun = hoursSince !== null && hoursSince < 1;

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
          <Icon icon="solar:server-broken" width={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-hi">Tender Source</p>
          <p className="text-xs text-text-lo">Trigger an ad-hoc run of a specific configured source.</p>
        </div>
      </div>

      {/* Source picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-lo">Source</label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {tenderTypes.map((type) => {
            const h = healthMap[type];
            const isSelected = selectedSource === type;
            const hrs = h?.last_run_at ? (Date.now() - new Date(h.last_run_at).getTime()) / (1000 * 60 * 60) : null;
            const fresh = hrs !== null && hrs < 1;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectSource(type)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-brand-500/50 bg-brand-500/8 text-text-hi"
                    : "border-app-border bg-surface text-text-lo hover:border-brand-500/30 hover:text-text-hi"
                }`}
              >
                <span className="font-medium truncate">{type}</span>
                {h?.last_run_at && (
                  <span className={`ml-2 shrink-0 text-[10px] ${fresh ? "text-status-warning" : "text-text-lo"}`}>
                    {fresh && <Icon icon="solar:clock-circle-broken" width={10} className="mr-0.5 inline" />}
                    {formatRelativeTime(h.last_run_at)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Health hint for selected source */}
      {health && (
        <div className="rounded-xl border border-app-border bg-surface-2 px-4 py-3 text-xs text-text-lo">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {health.last_run_at && (
              <span>Last run: <span className="font-medium text-text-hi">{formatRelativeTime(health.last_run_at)}</span></span>
            )}
            {health.last_tender_count != null && (
              <span>Last found: <span className="font-medium text-text-hi">{health.last_tender_count} tenders</span></span>
            )}
            {health.consecutive_zero_runs != null && health.consecutive_zero_runs > 0 && (
              <span className="text-status-warning">
                <Icon icon="solar:danger-triangle-broken" width={11} className="mr-0.5 inline" />
                {health.consecutive_zero_runs} empty run{health.consecutive_zero_runs !== 1 ? "s" : ""} in a row
              </span>
            )}
          </div>
          {recentlyRun && (
            <p className="mt-1.5 text-status-warning">
              <Icon icon="solar:clock-circle-broken" width={11} className="mr-1 inline" />
              This source ran less than an hour ago — running again may not find new tenders.
            </p>
          )}
        </div>
      )}

      <Button
        onClick={onRun}
        disabled={!selectedSource || isRunning}
        className="w-full"
      >
        {isRunning ? (
          <>
            <Icon icon="solar:refresh-broken" width={15} className="animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Icon icon="solar:play-broken" width={15} />
            Run {selectedSource || "Source"}
          </>
        )}
      </Button>
    </GlassPanel>
  );
}
