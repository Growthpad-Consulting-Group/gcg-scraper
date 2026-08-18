-- Reddit keyword monitoring — surfaces posts mentioning tender/opportunity-relevant keywords.
-- (A LinkedIn-post equivalent was considered but skipped: the existing LinkedIn-post-to-tender
-- pipeline in run-linkedin-tenders-scrape.ts already covers that ground with real filtering and
-- link resolution, so a second raw-mentions feed would just duplicate cost without the rigor.)

alter table scrape_jobs drop constraint scrape_jobs_kind_check;
alter table scrape_jobs add constraint scrape_jobs_kind_check
  check (kind = ANY (ARRAY['search-query'::text, 'tender-source'::text, 'tender-website'::text, 'gmb-leads'::text, 'linkedin-leads'::text, 'reddit-leads'::text]));

create table if not exists reddit_leads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references scrape_jobs(id) on delete set null,
  title text not null,
  subreddit text,
  author text,
  post_url text,
  upvotes integer,
  num_comments integer,
  posted_at timestamptz,
  matched_keyword text,
  search_query text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists reddit_leads_job_id_idx on reddit_leads(job_id);
