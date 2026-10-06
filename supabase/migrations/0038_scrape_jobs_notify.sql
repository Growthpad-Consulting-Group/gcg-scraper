-- Add Slack notification flag for ad-hoc jobs (Run Query interface).
--
-- Previously, notifyTaskOwner() only fired for scheduled tasks (task_id not null) — ad-hoc
-- Run Query jobs silently skipped notifications even if they found results, under the assumption
-- users were watching the live console anyway. This flag lets users opt into Slack pings for
-- ad-hoc runs too (e.g. when bulk-testing a new search term or running a one-off check and
-- stepping away from the console).
--
-- Scheduled tasks ignore this flag and notify unconditionally if slack_notifications_enabled
-- is true on the task; ad-hoc jobs check this flag instead.

alter table scrape_jobs add column notify_on_completion boolean default false;
