-- Per-search-term acceptance rate tracking — accumulates across runs so the Settings page can
-- show which terms historically produce high-quality tenders vs. burning credits for rejections.
create table if not exists search_term_performance (
  id           bigserial primary key,
  term         text not null,
  runs         int  not null default 0,
  total_found  int  not null default 0,
  total_rejected int not null default 0,
  last_run_at  timestamptz,
  updated_at   timestamptz not null default now(),
  unique (term)
);

create index if not exists search_term_performance_term_idx on search_term_performance(term);
