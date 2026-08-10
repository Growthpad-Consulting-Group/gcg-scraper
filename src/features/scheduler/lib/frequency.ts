// Pure, client-safe (no Inngest/Supabase imports) so both the cron job's due-check and the
// Overview page's "next run" display compute from the exact same interval definitions instead
// of two copies silently drifting apart.

// "Every 3 Hours" / "Every 12 Hours" match the options TaskForm actually offers.
export const FREQUENCY_MS: Record<string, number> = {
  Hourly: 60 * 60 * 1000,
  "Every 3 Hours": 3 * 60 * 60 * 1000,
  "Every 12 Hours": 12 * 60 * 60 * 1000,
  Daily: 24 * 60 * 60 * 1000,
  Weekly: 7 * 24 * 60 * 60 * 1000,
  Monthly: 30 * 24 * 60 * 60 * 1000,
};
export const DEFAULT_INTERVAL_MS = FREQUENCY_MS.Daily;

export function intervalMsFor(frequency: string | null): number {
  return (frequency ? FREQUENCY_MS[frequency] : undefined) ?? DEFAULT_INTERVAL_MS;
}

/** Never run ⇒ due immediately, so "next run" is just now rather than a stale future date. */
export function nextRunAt(task: { frequency: string | null; last_run: string | null }): Date {
  if (!task.last_run) return new Date();
  return new Date(new Date(task.last_run).getTime() + intervalMsFor(task.frequency));
}

/** Only accurate to within the 15-minute cron sweep that actually triggers runs — "in ~6 hours"
 * not "in 6h 3m", since finer granularity would imply a precision that doesn't exist. */
export function nextRunLabel(task: { frequency: string | null; last_run: string | null }): string {
  const diffMs = nextRunAt(task).getTime() - Date.now();
  if (diffMs <= 0) return "due now";

  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ~${hours}h`;
  const days = Math.round(hours / 24);
  return `in ~${days}d`;
}
