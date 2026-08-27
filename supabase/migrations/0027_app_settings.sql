-- Generic key/value store for business-tunable settings (retention windows, reminder timing, ...)
-- that previously required a code change + redeploy to adjust. Deliberately excludes secrets/API
-- keys — those stay in env vars, not the database, per the Settings page discussion. A missing key
-- means "use the app's hardcoded default" (see shared/lib/appSettings.ts) rather than an error, so
-- this table can start empty.
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
