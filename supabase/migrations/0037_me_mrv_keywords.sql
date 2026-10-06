-- M&E / MRV anchor keywords for the tender relevance filter.
--
-- Confirmed missed: UNGM "Development, Configuration and Operationalization of the Project
-- M&E/MRV System" (https://www.ungm.org/Public/Notice/316035) was rejected on keywords — none of
-- the 228 curated terms or the comms/branding anchors from migration 0030 cover monitoring &
-- evaluation / MRV work, even though GCG does take on M&E system development. Same fix pattern as
-- 0030: add bare anchor terms to the 228-term fixed-source tasks and the global search_terms
-- table (Website Tenders keyword fallback + LLM prompt hint). Search Query Tenders tasks keep
-- their own focused lists untouched, same as before.

do $$
declare
  anchors text[] := array[
    'monitoring and evaluation','monitoring & evaluation','m&e','mrv','m&e system',
    'mrv system','results framework','results monitoring','impact evaluation',
    'baseline survey','endline survey','data collection system','performance monitoring'
  ];
begin
  -- Live data check (2026-10-06): the 16 fixed-source tasks that got the 0030 anchors now carry
  -- 269 terms each (228 curated + 30 anchors, net of a couple of duplicates) — Search Query
  -- Tenders tasks sit at 5-12, so 269 cleanly identifies the same task set 0030 touched.
  update scheduled_tasks
  set search_terms = (select array_agg(distinct t) from unnest(search_terms || anchors) as t)
  where coalesce(array_length(search_terms, 1), 0) = 269;

  insert into search_terms (term)
  select t from unnest(anchors) as t
  where not exists (select 1 from search_terms s where s.term = t);
end $$;
