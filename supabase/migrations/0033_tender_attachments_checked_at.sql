-- resolve-document's lazy resolution originally reused document_checked_at as the cache flag
-- for both document_url AND attachments. Once attachments resolution was added, every tender
-- whose document had already been checked (before that logic existed) got permanently skipped —
-- document_checked_at being set says nothing about whether attachments were ever attempted. A
-- separate flag lets each be retried independently.
alter table tenders add column if not exists attachments_checked_at timestamptz;
