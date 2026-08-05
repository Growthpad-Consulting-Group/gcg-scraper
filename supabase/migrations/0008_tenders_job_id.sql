-- Unlike leads/linkedin_leads, tenders never recorded which scrape_job produced them, so "View"
-- from a run in the Overview feed could never actually filter down to that run's results —
-- it just opened the entire unfiltered Tenders table.
alter table tenders add column if not exists job_id uuid references scrape_jobs(id) on delete set null;
create index if not exists tenders_job_id_idx on tenders(job_id);
