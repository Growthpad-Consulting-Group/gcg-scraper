-- Replaces the hardcoded DEFAULT_PROCUREMENT_PHRASES JS constant with a real table, matching the
-- existing search_terms/base_keywords pattern — managed the same way, not baked into app code.
-- A task's own linkedin_search_phrases column still wins when set; this table is only the
-- suggestions list shown in the form and the fallback used when a task hasn't customized it.
create table if not exists linkedin_search_phrases (
  id serial primary key,
  phrase text not null unique,
  created_at timestamptz not null default now()
);

insert into linkedin_search_phrases (phrase) values
  ('invitation for bid'),
  ('invitation to bid'),
  ('invitation for tender'),
  ('tender notice'),
  ('notice of tender'),
  ('procurement notice'),
  ('request for quotation'),
  ('request for proposals'),
  ('call for tender'),
  ('call for bids')
on conflict (phrase) do nothing;
