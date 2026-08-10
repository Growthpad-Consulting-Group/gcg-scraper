-- Blocked domains are skipped during search-query scraping — typically paywalled sites,
-- login-required portals, or aggregators that never expose extractable tender data.
-- Matching is done on the hostname only (e.g. "reliefweb.int") so all paths under
-- that domain are skipped without needing to enumerate every URL pattern.

create table if not exists blocked_domains (
  id        serial primary key,
  domain    text not null unique,
  reason    text,
  created_at timestamptz not null default now()
);

-- Seed a handful of well-known paywalled / login-required tender portals.
insert into blocked_domains (domain, reason) values
  ('tendersinfo.com',      'Subscription required'),
  ('tender247.com',        'Subscription required'),
  ('bidsinfo.com',         'Login required'),
  ('tendersontime.com',    'Subscription required'),
  ('globaltenders.com',    'Subscription required'),
  ('linkedin.com',         'Login required — leads, not tenders'),
  ('facebook.com',         'Login required'),
  ('twitter.com',          'Login required'),
  ('x.com',                'Login required')
on conflict (domain) do nothing;
