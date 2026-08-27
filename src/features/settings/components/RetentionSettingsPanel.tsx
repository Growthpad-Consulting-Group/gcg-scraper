"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Button from "@/shared/ui/Button";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { APP_SETTINGS_DEFAULTS, type AppSettings } from "@/shared/lib/appSettings";

const FIELDS: { key: keyof AppSettings; label: string; help: string }[] = [
  { key: "closed_tender_retention_days", label: "Closed tender retention (days)", help: "Closed tenders older than this are deleted by the daily cleanup." },
  { key: "finished_job_retention_days", label: "Finished job retention (days)", help: "Scrape job history (done/error/canceled) older than this is deleted." },
  { key: "read_notification_retention_days", label: "Read notification retention (days)", help: "Only already-read notifications are ever deleted — unread ones are kept regardless of age." },
  { key: "rejected_tender_retention_days", label: "Rejected candidate retention (days)", help: "Diagnostic \"why was this rejected\" records shown on the Overview run feed." },
  { key: "reminder_window_days", label: "Closing-soon reminder window (days)", help: "How many days before a tender's deadline the Slack reminder fires." },
];

export default function RetentionSettingsPanel() {
  const { resolvedMode: mode } = useTheme();
  const [values, setValues] = useState<AppSettings>(APP_SETTINGS_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const inputClass = "h-9 w-24 rounded-md border border-app-border bg-canvas px-3 text-sm text-text-hi outline-none focus:border-brand-500";

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load settings");
        setValues(data.settings);
      } catch (err: any) {
        toast.error("Error loading settings: " + err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleChange = (key: keyof AppSettings, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return;
    setValues((prev) => ({ ...prev, [key]: Math.round(n) }));
    setDirty(true);
  };

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
      setDirty(false);
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-4 rounded-lg p-4">
      <div>
        <p className="text-sm font-medium text-text-hi">Retention & Timing</p>
        <p className="text-xs text-text-lo">
          Controls how long data is kept before the daily cleanup job removes it, and how far ahead of a deadline the closing-soon Slack reminder fires. Changes take effect on the next scheduled run — nothing here re-runs immediately.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-text-lo">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="text-sm text-text-hi">{f.label}</label>
                <p className="text-xs text-text-lo">{f.help}</p>
              </div>
              <input
                type="number"
                min={1}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <Button size="sm" onClick={handleSave} disabled={isSaving || !dirty}>
          <Icon icon={isSaving ? "mdi:loading" : "solar:diskette-broken"} width={15} className={isSaving ? "animate-spin" : ""} />
          Save changes
        </Button>
      </div>
    </GlassPanel>
  );
}
