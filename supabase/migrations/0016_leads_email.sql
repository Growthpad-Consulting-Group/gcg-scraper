-- GMB leads now request Apify's "company contacts enrichment" add-on, which scrapes each
-- business's own website for a contact email — store it alongside phone/website.
alter table leads add column if not exists email text;

-- Also requests the "business leads enrichment" add-on, which finds named employees at each
-- business (name, job title, work email, phone, LinkedIn profile) — this is how LinkedIn contact
-- info reaches the app at all, since the LinkedIn actor itself (no-login, public-search-only) has
-- no access to emails/phones LinkedIn never exposes publicly. `contacts` keeps every enriched
-- person found for the business; the flattened columns surface the first (primary) one in the
-- leads table without a join.
alter table leads add column if not exists contact_name text;
alter table leads add column if not exists contact_email text;
alter table leads add column if not exists contact_phone text;
alter table leads add column if not exists contact_linkedin text;
alter table leads add column if not exists contacts jsonb;
