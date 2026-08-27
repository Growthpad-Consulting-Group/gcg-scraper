"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { APP_SETTINGS_DEFAULTS, type AppSettings } from "@/shared/lib/appSettings";

const FIELDS: { key: keyof AppSettings; icon: string; label: string; help: string }[] = [
  { key: "closed_tender_retention_days", icon: "solar:case-minimalistic-broken", label: "Closed tender retention", help: "Closed tenders older than this are deleted by the daily cleanup." },
  { key: "finished_job_retention_days", icon: "solar:history-broken", label: "Finished job retention", help: "Scrape job history (done/error/canceled) older than this is deleted." },
  { key: "read_notification_retention_days", icon: "solar:bell-broken", label: "Read notification retention", help: "Only already-read notifications are ever deleted — unread ones are kept regardless of age." },
  { key: "rejected_tender_retention_days", icon: "solar:filter-broken", label: "Rejected candidate retention", help: "Diagnostic \"why was this rejected\" records shown on the Overview run feed." },
  { key: "reminder_window_days", icon: "solar:alarm-broken", label: "Closing-soon reminder window", help: "How many days before a tender's deadline the Slack reminder fires." },
];

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-app-border bg-canvas">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex w-8 items-center justify-center text-text-lo transition-colors hover:bg-surface-2 hover:text-text-hi"
        aria-label="Decrease"
      >
        <Icon icon="mdi:minus" width={14} />
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 1) onChange(Math.round(n));
        }}
        className="w-14 border-x border-app-border bg-transparent text-center text-sm text-text-hi outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex w-8 items-center justify-center text-text-lo transition-colors hover:bg-surface-2 hover:text-text-hi"
        aria-label="Increase"
      >
        <Icon icon="mdi:plus" width={14} />
      </button>
    </div>
  );
}

export default function RetentionSettingsPanel() {
  const { resolvedMode: mode } = useTheme();
  const [values, setValues] = useState<AppSettings>(APP_SETTINGS_DEFAULTS);
  const [saved, setSaved] = useState<AppSettings>(APP_SETTINGS_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const dirty = FIELDS.some((f) => values[f.key] !== saved[f.key]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load settings");
        setValues(data.settings);
        setSaved(data.settings);
      } catch (err: any) {
        toast.error("Error loading settings: " + err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setValues(data.settings);
      setSaved(data.settings);
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gcg-orange to-gcg-orange-dark shadow-lg shadow-gcg-orange/30">
          <Icon icon="solar:clock-circle-broken" width={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-hi">Retention & Timing</p>
          <p className="text-xs text-text-lo">
            How long data is kept before the daily cleanup removes it, and how far ahead of a deadline the closing-soon Slack reminder fires.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="h-16 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FIELDS.map((f) => {
            const changed = values[f.key] !== saved[f.key];
            return (
              <div
                key={f.key}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                  changed ? "border-brand-500/40 bg-brand-500/5" : "border-app-border bg-canvas/40"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Icon icon={f.icon} width={18} className="mt-0.5 shrink-0 text-text-lo" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-hi">{f.label}</p>
                    <p className="text-xs text-text-lo">{f.help}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Stepper value={values[f.key]} onChange={(n) => setValues((prev) => ({ ...prev, [f.key]: n }))} />
                  <span className="font-mono text-[10px] uppercase tracking-wide text-text-lo">days</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-app-border pt-4">
        <Button size="sm" onClick={handleSave} disabled={isSaving || !dirty}>
          <Icon icon={isSaving ? "mdi:loading" : "solar:diskette-broken"} width={15} className={isSaving ? "animate-spin" : ""} />
          Save changes
        </Button>
        {dirty && !isSaving && <Badge status="warning">Unsaved changes</Badge>}
        <span className="text-xs text-text-lo">Changes take effect on the next scheduled run — nothing re-runs immediately.</span>
      </div>
    </GlassPanel>
  );
}
