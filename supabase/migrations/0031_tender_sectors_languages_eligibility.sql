-- Three fields DevelopmentAid's tender page shows that ours didn't capture: Sectors (broader than
-- our existing `category`, e.g. "Financial Services & Audit, Agriculture & Rural Development" vs
-- a single "Consulting services"), Languages, and Eligibility (who's allowed to bid — usually
-- "Organisation" vs "Individual"). Nullable/empty on every existing row and most sources going
-- forward too — only populated where a source's page actually states them; the extraction prompt
-- is told to leave these blank rather than guess, same convention as category/organization.
alter table tenders add column if not exists sectors text[];
alter table tenders add column if not exists languages text[];
alter table tenders add column if not exists eligibility text;
