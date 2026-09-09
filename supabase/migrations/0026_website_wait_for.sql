-- Most sites in `websites` are static HTML and extract fine with Firecrawl's default render wait.
-- IUCN's new procurement portal (procurement.iucn.org, replacing the legacy currently-running-tenders
-- page it's migrating off) is a client-rendered SPA that returns near-empty content without a longer
-- wait — confirmed live: default scrape returned 12 chars ("Open tenders"), a 4s wait returned the
-- full open-tenders table. Per-site rather than a global default so the other ~164 sites (all
-- static) don't pay the extra wait time/cost on every run.
alter table websites add column if not exists wait_for_ms integer;

update websites set wait_for_ms = 4000 where id = 77; -- IUCN (procurement.iucn.org)
