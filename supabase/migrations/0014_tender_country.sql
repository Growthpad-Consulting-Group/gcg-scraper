-- `location` is free text ("Nairobi, Kenya", "Accra, Ghana", "Kenya") straight from extraction —
-- too inconsistent to filter on directly. `country` is a canonical name pulled out of it at
-- insert time (see countries.ts:normalizeCountry) so the Tenders page can filter by an actual
-- discrete country instead of near-duplicate raw strings.

alter table tenders
  add column if not exists country text;
