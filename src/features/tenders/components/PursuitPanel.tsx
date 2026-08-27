"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import type { BadgeStatus } from "@/shared/ui/Badge";
import Badge from "@/shared/ui/Badge";

export const PURSUIT_OPTIONS: { value: string; label: string; status: BadgeStatus }[] = [
  { value: "watching", label: "Watching", status: "info" },
  { value: "applied", label: "Applied", status: "warning" },
  { value: "won", label: "Won", status: "success" },
  { value: "lost", label: "Lost", status: "danger" },
  { value: "passed", label: "Passed", status: "neutral" },
];

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
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFields(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const save = async (updates: Partial<PursuitFields>, field: keyof PursuitFields) => {
    setSavingField(field);
    try {
      const saved = await patchTender(tenderId, updates);
      const next = { ...fields, ...updates };
      setFields(next);
      onSaved?.(next);
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

  const selectClass = "h-8 rounded-md border border-app-border bg-canvas px-2 text-xs text-text-hi outline-none focus:border-brand-500";
  const inputClass = "h-8 flex-1 rounded-md border border-app-border bg-canvas px-2 text-xs text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500";

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-3"}>
      <div className={compact ? "flex items-center gap-2" : "flex flex-wrap items-center gap-3"}>
        <div className="flex items-center gap-1.5">
          {!compact && <label className="text-xs font-medium text-text-lo">Status</label>}
          <select
            value={fields.pursuit_status ?? ""}
            onChange={(e) => save({ pursuit_status: e.target.value || null }, "pursuit_status")}
            className={selectClass}
          >
            <option value="">Not reviewed</option>
            {PURSUIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {savingField === "pursuit_status" && <Icon icon="mdi:loading" width={12} className="animate-spin text-text-lo" />}
        </div>

        <div className="flex items-center gap-1.5">
          {!compact && <label className="text-xs font-medium text-text-lo">Assigned to</label>}
          <input
            value={fields.assigned_to ?? ""}
            onChange={(e) => setFields((prev) => ({ ...prev, assigned_to: e.target.value }))}
            onBlur={() => save({ assigned_to: fields.assigned_to?.trim() || null }, "assigned_to")}
            placeholder={compact ? "Assign to…" : "e.g. name@growthpad.co.ke"}
            className={inputClass}
          />
          {savingField === "assigned_to" && <Icon icon="mdi:loading" width={12} className="animate-spin text-text-lo" />}
        </div>
      </div>

      {!compact && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-lo">Notes</label>
          <textarea
            value={fields.pursuit_notes ?? ""}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Internal notes about pursuing this tender — bid strategy, blockers, who to loop in…"
            rows={3}
            className="w-full resize-y rounded-md border border-app-border bg-canvas p-2 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
          />
        </div>
      )}
    </div>
  );
}
