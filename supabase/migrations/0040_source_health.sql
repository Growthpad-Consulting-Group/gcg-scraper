-- Per-source health tracking — upserted after every run-source-scrape job so the Settings page
-- can show last-run time and last tender count per source without querying the full scrape_jobs
-- history. Keyed on tender_type (one row per source) since that's the stable identifier used
-- across SOURCE_CONFIGS, scrape_jobs, and tenders.
create table if not exists source_health (
  tender_type text primary key,
  last_run_at timestamptz not null,
  last_tender_count integer not null default 0,
  last_status text not null default 'done', -- 'done' | 'error'
  consecutive_zero_runs integer not null default 0,
  updated_at timestamptz not null default now()
);
