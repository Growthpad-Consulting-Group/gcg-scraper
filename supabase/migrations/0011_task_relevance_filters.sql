-- Fixed-source tender scrapers (PPIP, UNGM, Treasury, UNDP, ...) previously extracted every
-- listing on the page with no relevance filtering, so aggregator sites like UNGM returned
-- tenders from anywhere in the world regardless of what the task owner actually cares about.
-- `search_terms` already existed per-task but was only wired into the generic "Search Query
-- Tenders" flow; `countries` is new and lets a task scope results to specific markets
-- (e.g. "Kenya, Ghana, East Africa, West Africa").

alter table scheduled_tasks
  add column if not exists countries text[] not null default '{}';
