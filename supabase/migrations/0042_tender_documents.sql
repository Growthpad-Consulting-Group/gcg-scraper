-- Parsed content from PDF/document attachments on tenders.
-- Populated by the scrape pipeline after insertion; deduped by attachment URL so a document
-- is only parsed once even if the same PDF appears on multiple tender runs.
create table if not exists tender_documents (
  id           bigserial primary key,
  tender_id    bigint not null references tenders(id) on delete cascade,
  url          text not null unique,
  filename     text,
  parsed_content text,
  parse_error  text,
  parsed_at    timestamptz not null default now()
);

create index if not exists tender_documents_tender_id_idx on tender_documents(tender_id);
