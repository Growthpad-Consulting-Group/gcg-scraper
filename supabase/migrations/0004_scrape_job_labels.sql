-- Run Feed (docs/UI_REDESIGN.md §5) needs a human-readable label and source kind per run
-- without inferring it from result_summary shape. Both are set at insert time by the route
-- that creates the job.
alter table scrape_jobs add column if not exists kind text not null default 'search-query'
  check (kind in ('search-query', 'tender-source', 'tender-website', 'gmb-leads', 'linkedin-leads'));
alter table scrape_jobs add column if not exists label text;
