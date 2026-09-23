-- Separates the shared `websites` batch pool by scope so multiple "Website Tenders"-type
-- scheduled tasks can each own a distinct subset, instead of every such task pulling from the
-- exact same next-N-by-last_scraped_at batch regardless of which task triggered the job.
-- Existing rows are all Kenya/East-Africa-focused org pages, hence the 'kenya' default.
alter table websites add column if not exists scope text not null default 'kenya';

-- Which scope a "Website Tenders" scheduled task should pull from. Null means unscoped/legacy
-- (falls back to 'kenya' at the call site) so existing tasks keep working without a migration.
alter table scheduled_tasks add column if not exists website_scope text;
