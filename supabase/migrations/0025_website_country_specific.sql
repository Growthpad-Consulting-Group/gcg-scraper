-- `websites.location` is a uniform "Kenya" scan-scope tag applied to every row in this curated
-- ~163-site list (it's how these sites got selected for the batch), not a factual claim about
-- where each organization's tenders are actually located. run-website-scrape.ts used it as an LLM
-- extraction fallback ("if the tender's location isn't stated, use this") which produces wrong
-- data for global orgs on the list (e.g. Welthungerhilfe, World Vision, CARE International) whose
-- own tenders pages aren't Kenya-specific — confirmed live: a Welthungerhilfe tender with no
-- stated location was saved as "Kenya" purely because of this scan-scope tag.
--
-- This adds a real distinction: is_country_specific is true only for sites that are themselves
-- genuinely Kenya-scoped (local chapter/local-only org, Kenya-hosted domain, or Kenya in the org
-- name) - only those are safe to use as a location fallback. Backfilled here by name/domain
-- heuristic (checked by hand against the full list); new sites default to false (safer) and can be
-- flipped individually if a future addition is confirmed Kenya-specific.
alter table websites add column if not exists is_country_specific boolean not null default false;

update websites
set is_country_specific = true
where id in (
  43, 19, 144, 122, 161, 6, 23, 154, 66, 162, 163, 129, 155, 60, 39, 131, 52, 57, 134, 8, 56, 135,
  139, 79, 136, 61, 65, 4, 62, 34, 125, 146, 164, 105, 15, 140, 38, 58, 59, 126, 145, 137, 18, 138
);
