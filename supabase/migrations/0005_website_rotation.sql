-- Website Tenders batch scraping always took the first BATCH_SIZE rows by id, so anything past
-- that never got checked. Tracking last_scraped_at lets the batch query order by oldest-checked
-- first, rotating through the full list over time instead of the same head slice forever.
alter table websites add column if not exists last_scraped_at timestamptz;
