-- Phase 3: LinkedIn people leads, via a no-cookie Apify actor (no LinkedIn account/login used,
-- so no ban risk). Separate table from `leads` since profile fields (name, headline, company)
-- don't map onto GMB's business fields.

create table if not exists linkedin_leads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references scrape_jobs(id) on delete set null,
  full_name text not null,
  headline text,
  location text,
  current_company text,
  profile_url text,
  search_query text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists linkedin_leads_job_id_idx on linkedin_leads(job_id);
