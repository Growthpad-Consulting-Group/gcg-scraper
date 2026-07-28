-- Phase 1 foundation schema.
--
-- IMPORTANT: this Supabase project already contains the LIVE production database used
-- directly by the Python/Flask backend (users, magic_tokens, scheduled_tasks, tenders,
-- websites, search_terms, base_keywords, closing_keywords, relevant_keywords, countries,
-- tendertypes, notifications, scraping_log, task_logs, task_search_terms, user_preferences).
-- Do NOT recreate any of those tables here. This migration only adds what's missing for
-- the new Next.js app: a sessions table for cookie-based auth (magic_tokens/users already
-- exist and are reused as-is) and a scrape_jobs table for the Inngest job queue.

create extension if not exists pgcrypto;

-- Cookie sessions for the existing `users` table (users.id is integer, not uuid).
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id integer not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on sessions(user_id);

-- Scrape job queue driven by Inngest. Links to the existing `scheduled_tasks` table
-- (scheduled_tasks.task_id is integer) for scheduled runs; task_id is null for ad hoc runs.
create table if not exists scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  task_id integer references scheduled_tasks(task_id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error', 'canceled')),
  progress jsonb not null default '{}'::jsonb,
  result_summary jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists scrape_jobs_task_id_idx on scrape_jobs(task_id);

alter publication supabase_realtime add table scrape_jobs;
