-- Aggregator sources like UNGM only expose the real PDF/document link on a tender's own detail
-- page, one level deeper than the listing page Firecrawl scrapes during extraction — so
-- `document_url` often just repeats `source_url` at scrape time. Resolving the real link is
-- deferred to first tender-detail-page view instead of done eagerly for every tender on every
-- scrape (which would multiply Firecrawl calls per run). `document_checked_at` caches that a
-- resolution attempt was made — successful or not — so repeat views don't re-scrape.

alter table tenders
  add column if not exists document_checked_at timestamptz;
