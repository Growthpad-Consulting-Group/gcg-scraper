-- `source_url` is the listing page, not necessarily the actual RFP document to download, and the
-- "raw" view in the UI was re-serializing the parsed row instead of showing real scraped content.
alter table tenders add column if not exists document_url text;
alter table tenders add column if not exists raw_content text;
