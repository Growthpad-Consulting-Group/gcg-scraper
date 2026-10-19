-- Per-user notification preferences — controls who gets alerted when new tenders are found,
-- independent of which task found them. A user can opt into alerts for specific sources or
-- keywords; both filters are ANDed (tender_types AND keywords must both match when both are set).
create table if not exists notification_preferences (
  id               bigserial primary key,
  user_id          integer not null references users(id) on delete cascade,
  tender_types     text[],          -- null = all sources
  keywords         text[],          -- null = no keyword filter (match all)
  slack_enabled    boolean not null default true,
  email_enabled    boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id)
);

create index if not exists notification_preferences_user_id_idx on notification_preferences(user_id);
