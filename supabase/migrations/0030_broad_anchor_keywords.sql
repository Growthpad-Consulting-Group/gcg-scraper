-- Broad "anchor" keywords for the tender relevance filter.
--
-- Diagnosis (3 weeks of live scrape data): every fixed-source task carried the same 228 curated
-- terms, all compound service-catalogue phrases ("strategic communications", "brand strategy",
-- "360 marketing campaign"). matchesKeywords (sourceConfigs.ts) requires the phrase verbatim on a
-- word boundary, so plainly-titled tenders slipped straight into the reject pile:
--   * PPIP  "CONSULTANCY SERVICES FOR DEVELOPMENT OF COMMUNICATIONS & BRANDING STRATEGY ..."
--   * UNGM  "Production of Campaign Ideas, Creative Elements and Video Content"
--   * DevelopmentAid  "Execution of Marketing and Communications Campaigns ..."
-- ~370 tenders extracted from gov/MDB sources in 14 days, 0 kept, almost all "keyword mismatch".
--
-- These ~30 bare anchors catch the generic-title case. Chosen for a low false-positive rate — a
-- word that's almost always GCG-relevant when it appears in a tender title. tenders.matched_keywords
-- (migration 0029) records which term pulled each tender, so a noisy anchor can be spotted and
-- pruned from the task lists later without another migration.
--
-- Applied to: the 12 tasks that carried the full 228-term curated list, and the global
-- search_terms table (feeds the Website Tenders keyword fallback + the LLM prompt hint). The 15
-- "Search Query Tenders" tasks keep their small focused lists untouched — that path filters at
-- search time, not on keyword text, and its pass rate is already healthy.

do $$
declare
  anchors text[] := array[
    'communication','communications','communication strategy','communications strategy',
    'strategic communication','branding','rebranding','brand identity','visual identity',
    'public relations','media campaign','awareness campaign','awareness raising','graphic design',
    'creative services','creative agency','content creation','social media management',
    'digital marketing','videography','photography services','animation','website development',
    'website design','web portal','digital platform','e-learning','stakeholder engagement',
    'advocacy campaign','event management','knowledge management','campaign development'
  ];
begin
  update scheduled_tasks
  set search_terms = (select array_agg(distinct t) from unnest(search_terms || anchors) as t)
  where coalesce(array_length(search_terms, 1), 0) = 228;

  insert into search_terms (term)
  select t from unnest(anchors) as t
  where not exists (select 1 from search_terms s where s.term = t);
end $$;
