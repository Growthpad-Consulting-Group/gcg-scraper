-- A tender was only ever announced once, when first found — nothing reminded anyone before it
-- closed. `reminder_sent_at` caches that a closing-soon reminder was already sent for this
-- tender so the daily check fires exactly once per tender, not every day until it closes.

alter table tenders
  add column if not exists reminder_sent_at timestamptz;
