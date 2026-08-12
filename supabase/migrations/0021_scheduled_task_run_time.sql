-- Scheduling was purely elapsed-time-based ("N hours since last_run"), so a task's actual run
-- time drifted with whenever it happened to last fire rather than landing at a predictable hour.
-- run_time ("HH:MM", UTC) pins Daily/Weekly/Monthly tasks to a specific time of day; left null
-- keeps the old pure-interval behavior (Hourly/Every N Hours tasks ignore it entirely).
alter table scheduled_tasks add column if not exists run_time text;
