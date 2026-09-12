-- Many sources' extraction never captures a real description (aggregator listing pages often
-- just link out to the notice without restating its content) — the detail page's "Quick summary"
-- falls back to an AI-generated summary of raw_content in that case, generated lazily on first
-- view rather than for every tender up front (same lazy-resolve pattern as document_checked_at /
-- attachments_checked_at). ai_summary_generated_at caches the attempt, success or not.
alter table tenders add column if not exists ai_summary text;
alter table tenders add column if not exists ai_summary_generated_at timestamptz;
