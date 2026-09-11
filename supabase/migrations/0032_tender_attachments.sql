-- `document_url` only ever held one link, but real tender pages often list several downloadable
-- files (ToR, application form, annexes — confirmed live on GIZ's country pages: multiple
-- distinct .pdf/.zip links per posting). jsonb array of {url, name} rather than a plain text[] so
-- each attachment keeps a real filename for display, not just a bare URL.
alter table tenders add column if not exists attachments jsonb;
