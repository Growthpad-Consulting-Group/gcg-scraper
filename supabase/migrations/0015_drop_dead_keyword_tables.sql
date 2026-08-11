-- relevant_keywords and closing_keywords are legacy tables from the retired Python backend —
-- confirmed via full codebase search that nothing in the current scraping/extraction pipeline
-- reads from either (relevance filtering now runs entirely off each scheduled task's own
-- search_terms/countries). Their CRUD UI (Keyword Manager page) and API routes were removed
-- first; this drops the now-fully-unreferenced tables themselves.

drop table if exists relevant_keywords;
drop table if exists closing_keywords;
