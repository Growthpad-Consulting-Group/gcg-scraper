import type { SupabaseClient } from "@supabase/supabase-js";

// Business-tunable knobs that used to be hardcoded constants scattered across the codebase,
// requiring a code change + redeploy to adjust (retention windows, reminder timing). Deliberately
// excludes secrets/API keys, which stay in env vars — see the Settings page discussion.
export const APP_SETTINGS_DEFAULTS = {
  closed_tender_retention_days: 90,
  finished_job_retention_days: 30,
  read_notification_retention_days: 30,
  rejected_tender_retention_days: 30,
  reminder_window_days: 3,
};

export type AppSettings = typeof APP_SETTINGS_DEFAULTS;
export type AppSettingKey = keyof AppSettings;

/** Merges stored overrides onto the defaults — a key with no row (or a table that doesn't exist
 * yet, pre-migration) just falls back to its default rather than erroring, so every existing
 * caller keeps working unchanged until someone actually visits Settings and changes something. */
export async function getAppSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const result: AppSettings = { ...APP_SETTINGS_DEFAULTS };
  try {
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error) return result;
    for (const row of data || []) {
      if (row.key in result) (result as any)[row.key] = row.value;
    }
  } catch {
    // Table not migrated yet — defaults are still correct behavior.
  }
  return result;
}

export async function setAppSetting(supabase: SupabaseClient, key: AppSettingKey, value: unknown): Promise<void> {
  const { error } = await supabase.from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
