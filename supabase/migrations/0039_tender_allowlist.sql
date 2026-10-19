-- Allowlist for manually recovered tenders — a URL added here bypasses all rejection checks in
-- future scrape runs so a tender previously rejected by keyword/country/source-content filters
-- won't be dropped again after a user explicitly promotes it. Keyed on source_url (unique) since
-- that's the only per-tender identifier that's stable across runs; the original rejection reason
-- is recorded for auditing and UI display but doesn't limit which checks get bypassed (the whole
-- point of the allowlist is "trust this URL regardless of why it was rejected").
create table if not exists tender_allowlist (
  id bigserial primary key,
  source_url text not null unique,
  original_reason text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists tender_allowlist_source_url_idx on tender_allowlist(source_url);
