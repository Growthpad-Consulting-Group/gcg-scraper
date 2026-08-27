"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import type { BadgeStatus } from "@/shared/ui/Badge";

export const PURSUIT_OPTIONS: { value: string; label: string; status: BadgeStatus; icon: string }[] = [
  { value: "watching", label: "Watching", status: "info", icon: "solar:eye-broken" },
  { value: "applied", label: "Applied", status: "warning", icon: "solar:paper-broken" },
  { value: "won", label: "Won", status: "success", icon: "solar:cup-star-broken" },
  { value: "lost", label: "Lost", status: "danger", icon: "solar:close-circle-broken" },
  { value: "passed", label: "Passed", status: "neutral", icon: "solar:forbidden-circle-broken" },
];

// Tailwind can't see classnames built from string interpolation at build time, so the per-status
// pill styling has to be a literal lookup table rather than `text-status-${status}` etc.
const PILL_ACTIVE_CLASSES: Record<BadgeStatus, string> = {
  success: "border-status-success/40 bg-status-success/10 text-status-success",
  warning: "border-status-warning/40 bg-status-warning/10 text-status-warning",
  danger: "border-status-danger/40 bg-status-danger/10 text-status-danger",
  info: "border-status-info/40 bg-status-info/10 text-status-info",
  neutral: "border-text-lo/40 bg-surface-2 text-text-hi",
};

/** Renders nothing (rather than an "unset" badge) when there's no pursuit_status yet — most
 * tenders are never actioned, and a badge on every single row for "not reviewed" would be noise,
 * not signal. */
export function pursuitBadge(pursuitStatus?: string | null): { label: string; status: BadgeStatus } | null {
  return PURSUIT_OPTIONS.find((o) => o.value === pursuitStatus) ?? null;
}

export interface PursuitFields {
  pursuit_status: string | null;
  assigned_to: string | null;
  pursuit_notes: string | null;
}

async function patchTender(id: string | number, updates: Partial<PursuitFields>): Promise<PursuitFields> {
  const res = await fetch(`/api/tenders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save");
  return data.tender;
}

/**
 * Pursuit tracking (status/owner/notes) — a tender's only lifecycle before this was open/closed,
 * which is a scrape-derived fact, not a decision. This is deliberately the only place a tender's
 * fields are hand-edited; everything else comes from the scrape pipeline.
 *
 * Status is a row of colored toggle pills (click to set, click the active one again to clear)
 * rather than a dropdown — there are only 5 states plus "unset," and seeing every option's color
 * at once reads faster than opening a menu to find out what's available.
 *
 * `compact` (used in the Tenders list's inline expand row) shows just status + assignee, saved
 * immediately on change. The full version (tender detail page) adds a notes textarea, debounced
 * so it doesn't fire a request per keystroke.
 */
export default function PursuitPanel({
  tenderId,
  initial,
  compact = false,
  onSaved,
}: {
  tenderId: string | number;
  initial: PursuitFields;
  compact?: boolean;
  onSaved?: (fields: PursuitFields) => void;
}) {
  const [fields, setFields] = useState<PursuitFields>(initial);
  const [savingField, setSavingField] = useState<keyof PursuitFields | null>(null);
  const [justSaved, setJustSaved] = useState<keyof PursuitFields | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFields(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const flashSaved = (field: keyof PursuitFields) => {
    setJustSaved(field);
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    savedFlashTimer.current = setTimeout(() => setJustSaved(null), 1500);
  };

  const save = async (updates: Partial<PursuitFields>, field: keyof PursuitFields) => {
    setSavingField(field);
    try {
      const saved = await patchTender(tenderId, updates);
      const next = { ...fields, ...updates };
      setFields(next);
      onSaved?.(next);
      flashSaved(field);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingField(null);
    }
  };

  const handleNotesChange = (value: string) => {
    setFields((prev) => ({ ...prev, pursuit_notes: value }));
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => save({ pursuit_notes: value }, "pursuit_notes"), 800);
  };

  const inputClass =
    "h-8 flex-1 rounded-md border border-app-border bg-canvas px-2 text-xs text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

  return (
    <div className={compact ? "flex flex-wrap items-center gap-3" : "flex flex-col gap-4"}>
      <div className={compact ? "flex flex-wrap items-center gap-1.5" : "flex flex-col gap-1.5"}>
        {!compact && <label className="text-xs font-medium text-text-lo">Status</label>}
        <div className="flex flex-wrap items-center gap-1.5">
          {PURSUIT_OPTIONS.map((o) => {
            const active = fields.pursuit_status === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => save({ pursuit_status: active ? null : o.value }, "pursuit_status")}
                disabled={savingField === "pursuit_status"}
                className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                  active ? PILL_ACTIVE_CLASSES[o.status] : "border-app-border text-text-lo hover:border-text-lo hover:text-text-hi"
                }`}
                title={active ? `Click to unset (currently ${o.label})` : `Mark as ${o.label}`}
              >
                <Icon icon={o.icon} width={12} />
                {o.label}
              </button>
            );
          })}
          {savingField === "pursuit_status" && <Icon icon="mdi:loading" width={13} className="animate-spin text-text-lo" />}
          {justSaved === "pursuit_status" && <Icon icon="solar:check-circle-bold" width={13} className="text-status-success" />}
        </div>
      </div>

      <div className={compact ? "flex items-center gap-1.5" : "flex flex-col gap-1.5"}>
        {!compact && <label className="text-xs font-medium text-text-lo">Assigned to</label>}
        <div className="relative flex items-center gap-1.5">
          <Icon icon="solar:user-broken" width={13} className="pointer-events-none absolute left-2 text-text-lo" />
          <input
            value={fields.assigned_to ?? ""}
            onChange={(e) => setFields((prev) => ({ ...prev, assigned_to: e.target.value }))}
            onBlur={() => save({ assigned_to: fields.assigned_to?.trim() || null }, "assigned_to")}
            placeholder={compact ? "Assign to…" : "e.g. name@growthpad.co.ke"}
            className={`${inputClass} pl-6 ${compact ? "w-36" : "w-full"}`}
          />
          {savingField === "assigned_to" && <Icon icon="mdi:loading" width={13} className="animate-spin text-text-lo" />}
          {justSaved === "assigned_to" && <Icon icon="solar:check-circle-bold" width={13} className="text-status-success" />}
        </div>
      </div>

      {!compact && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-text-lo">Notes</label>
            {savingField === "pursuit_notes" && <Icon icon="mdi:loading" width={12} className="animate-spin text-text-lo" />}
            {justSaved === "pursuit_notes" && <Icon icon="solar:check-circle-bold" width={12} className="text-status-success" />}
          </div>
          <div className="rounded-xl border border-app-border bg-canvas/40 p-0.5">
            <textarea
              value={fields.pursuit_notes ?? ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Internal notes about pursuing this tender — bid strategy, blockers, who to loop in…"
              rows={3}
              className="w-full resize-y rounded-lg bg-transparent p-2.5 text-sm text-text-hi outline-none placeholder:text-text-lo"
            />
          </div>
        </div>
      )}
    </div>
  );
}
