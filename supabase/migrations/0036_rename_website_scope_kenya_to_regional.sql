-- 'kenya' was a misleading name for this scope — it actually covers every country task 88
-- filters by (Kenya, Ghana, Zambia, East Africa, West Africa), not just Kenya. Confirmed
-- confusing live: a GIZ Ghana row showed "location: Ghana, scope: kenya".
update websites set scope = 'regional' where scope = 'kenya';
alter table websites alter column scope set default 'regional';
update scheduled_tasks set website_scope = 'regional' where tender_type = 'Website Tenders' and (website_scope is null or website_scope = 'kenya');
