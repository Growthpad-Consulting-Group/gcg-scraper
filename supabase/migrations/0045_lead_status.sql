-- Lead outreach status — tracks where each lead is in the outreach pipeline.
-- Same pattern as tenders.pursuit_status: nullable so "not reviewed" is the default state.
alter table leads          add column if not exists lead_status text check (lead_status in ('new','contacted','qualified','not_relevant','converted'));
alter table linkedin_leads add column if not exists lead_status text check (lead_status in ('new','contacted','qualified','not_relevant','converted'));
alter table reddit_leads   add column if not exists lead_status text check (lead_status in ('new','contacted','qualified','not_relevant','converted'));

alter table leads          add column if not exists lead_notes text;
alter table linkedin_leads add column if not exists lead_notes text;
alter table reddit_leads   add column if not exists lead_notes text;
