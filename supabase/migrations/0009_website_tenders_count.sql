-- Tenders don't have a website_id FK — they only have source_url. Rather than a slow
-- per-request COUNT + URL-prefix join across potentially millions of rows, we keep a
-- denormalized counter on websites and update it via trigger whenever a tender is
-- inserted or deleted.

alter table websites add column if not exists tenders_count integer not null default 0;

-- Backfill: count existing tenders whose source_url starts with the website's url.
-- The website url may or may not have a trailing slash — strip it for the prefix match.
update websites w
set tenders_count = (
  select count(*)
  from tenders t
  where t.source_url like (rtrim(w.url, '/') || '%')
);

-- Trigger function: fires after INSERT or DELETE on tenders, incrementing or decrementing
-- the matching website's counter. Uses a prefix match on source_url, same as the backfill.
create or replace function update_website_tenders_count()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') then
    update websites
    set tenders_count = tenders_count + 1
    where NEW.source_url like (rtrim(url, '/') || '%');
  elsif (TG_OP = 'DELETE') then
    update websites
    set tenders_count = greatest(tenders_count - 1, 0)
    where OLD.source_url like (rtrim(url, '/') || '%');
  end if;
  return null;
end;
$$;

drop trigger if exists tenders_count_trigger on tenders;

create trigger tenders_count_trigger
after insert or delete on tenders
for each row execute function update_website_tenders_count();
