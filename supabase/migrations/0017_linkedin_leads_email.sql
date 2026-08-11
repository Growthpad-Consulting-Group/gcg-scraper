-- LinkedIn Leads now enriches each found profile with a real work email via a second no-cookie
-- actor (apimaestro/linkedin-profile-batch-scraper) — confirmed live that it returns actual
-- emails. There is no equivalent for phone: LinkedIn never publishes phone numbers on public
-- profiles under any circumstances, so no actor can retrieve one — not added here because it
-- can never be populated.
alter table linkedin_leads add column if not exists email text;
