-- Phase 2: GMB lead-generation. Additive only, same pattern as 0001_init.sql.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references scrape_jobs(id) on delete set null,
  source text not null default 'google_maps',
  business_name text not null,
  category text,
  address text,
  location text,
  phone text,
  website text,
  rating numeric,
  reviews_count integer,
  search_query text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists leads_job_id_idx on leads(job_id);
create index if not exists leads_location_idx on leads(location);
