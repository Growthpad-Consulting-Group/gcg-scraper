-- The app was pure discovery-and-notify with no way to track what happened after a tender was
-- found: no pursuit stage, no owner, no notes. pursuit_status is deliberately a free-standing
-- field (not derived from open/closed) since a tender can be "won" after its listing closed, or
-- "passed on" while still open - the two are unrelated axes.
alter table tenders add column if not exists pursuit_status text;
alter table tenders add column if not exists assigned_to text;
alter table tenders add column if not exists pursuit_notes text;
