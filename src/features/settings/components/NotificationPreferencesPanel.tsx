"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/shared/contexts/ThemeContext";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import GlassPanel from "@/shared/ui/GlassPanel";
import Button from "@/shared/ui/Button";

const ALL_SOURCES = [
  "UNGM Tenders", "TED", "PPIP", "ReliefWeb Jobs", "Kenya Treasury", "UNDP",
  "Job in Rwanda", "GHANEPS", "AfDB", "World Bank", "DevelopmentAid", "Tenderers KE", "IUCN Procurement",
];

interface Prefs {
  slack_enabled: boolean;
  email_enabled: boolean;
  tender_types: string[] | null;
  keywords: string[] | null;
}

const DEFAULTS: Prefs = { slack_enabled: true, email_enabled: false, tender_types: null, keywords: null };

export default function NotificationPreferencesPanel() {
  const { resolvedMode: mode } = useTheme();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saved, setSaved] = useState<Prefs>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/notification-preferences");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load preferences");
        if (data.preferences) {
          setPrefs(data.preferences);
          setSaved(data.preferences);
        }
      } catch (err: any) {
        toast.error("Error loading notification preferences: " + err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaved(prefs);
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSource = (src: string) => {
    const current = prefs.tender_types ?? [];
    const next = current.includes(src) ? current.filter((s) => s !== src) : [...current, src];
    setPrefs((p) => ({ ...p, tender_types: next.length > 0 ? next : null }));
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw) return;
    const current = prefs.keywords ?? [];
    if (!current.includes(kw)) {
      setPrefs((p) => ({ ...p, keywords: [...current, kw] }));
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    const next = (prefs.keywords ?? []).filter((k) => k !== kw);
    setPrefs((p) => ({ ...p, keywords: next.length > 0 ? next : null }));
  };

  const labelClass = "text-xs font-medium text-text-lo";
  const inputClass = "h-8 rounded-lg border border-app-border bg-canvas px-3 text-xs text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-brand-500/10">
          <Icon icon="solar:bell-broken" width={16} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-hi">Notification Preferences</h2>
          <p className="text-xs text-text-lo">Choose which sources and keywords trigger alerts for you.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-surface-2" />)}
        </div>
      ) : (
        <>
          {/* Channels */}
          <div className="flex flex-col gap-2">
            <p className={labelClass}>Alert channels</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "slack_enabled" as const, label: "Slack", icon: "simple-icons:slack" },
                { key: "email_enabled" as const, label: "Email", icon: "solar:letter-broken" },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    prefs[key]
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-app-border bg-surface-2 text-text-lo hover:text-text-hi"
                  }`}
                >
                  <Icon icon={icon} width={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="flex flex-col gap-2">
            <p className={labelClass}>
              Sources to watch
              <span className="ml-1 font-normal opacity-60">— leave all unselected to watch every source</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SOURCES.map((src) => {
                const active = (prefs.tender_types ?? []).includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => toggleSource(src)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "border-brand-500 bg-brand-500/10 text-brand-500"
                        : "border-app-border bg-surface-2 text-text-lo hover:text-text-hi"
                    }`}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-col gap-2">
            <p className={labelClass}>
              Keyword filter
              <span className="ml-1 font-normal opacity-60">— leave empty to receive all tenders from watched sources</span>
            </p>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                placeholder="e.g. road construction"
                className={`${inputClass} flex-1`}
              />
              <Button size="sm" variant="secondary" onClick={addKeyword} disabled={!keywordInput.trim()}>
                Add
              </Button>
            </div>
            {prefs.keywords && prefs.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {prefs.keywords.map((kw) => (
                  <span key={kw} className="flex items-center gap-1 rounded-full border border-app-border bg-surface-2 px-2.5 py-1 text-xs text-text-hi">
                    {kw}
                    <button type="button" onClick={() => removeKeyword(kw)} className="text-text-lo hover:text-status-danger">
                      <Icon icon="solar:close-circle-broken" width={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-app-border pt-3">
            <Button onClick={handleSave} disabled={!dirty || isSaving} size="sm">
              {isSaving ? <Icon icon="mdi:loading" width={14} className="animate-spin" /> : null}
              Save preferences
            </Button>
            {dirty && (
              <button type="button" onClick={() => setPrefs(saved)} className="text-xs text-text-lo hover:text-text-hi">
                Reset
              </button>
            )}
          </div>
        </>
      )}
    </GlassPanel>
  );
}
