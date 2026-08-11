-- LinkedIn Tenders' post-discovery phrases ("tender notice", "invitation for bid", ...) were
-- hardcoded — each one is a separate paid Apify search query, so a task owner had no way to see
-- or control what's actually driving cost per run. Editable per task now, defaulting to the
-- built-in list when left empty so existing behavior doesn't change until someone edits it.
alter table scheduled_tasks add column if not exists linkedin_search_phrases text[];
