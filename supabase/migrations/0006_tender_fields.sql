-- "Who's asking" and "what kind of tender" were missing entirely — source_url's domain is a weak
-- proxy for issuer, especially on aggregators (UNGM, ReliefWeb) where many issuers share one
-- domain. `budget` and `location` columns already existed but nothing ever populated them.
alter table tenders add column if not exists organization text;
alter table tenders add column if not exists category text;
