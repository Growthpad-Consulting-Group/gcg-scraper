-- Qualified relevance phrases recovered from the live rejected-candidate data (Nov 2026).
-- These are deliberately specific: broad single words such as "training", "survey", and
-- "strategy" admitted too many unrelated procurement notices, while the phrases below cover
-- real GCG-adjacent opportunities that the existing catalogue missed.

do $$
declare
  anchors text[] := array[
    'market activation',
    'activation campaign',
    'digital literacy',
    'policy and strategy formulation',
    'community sensitization',
    'citizen journalism training',
    'business management training',
    'leadership development',
    'community satisfaction survey',
    'baseline satisfaction survey',
    'training provider',
    'training facilitation',
    'vulnerability testing',
    'staff training',
    'awareness raising campaign'
  ];
begin
  -- Fixed-source tasks carry the large shared catalogue. Search-query tasks have small,
  -- task-specific lists and receive targeted queries below instead of every anchor.
  update scheduled_tasks
  set search_terms = (
    select array_agg(distinct term order by term)
    from unnest(coalesce(search_terms, '{}'::text[]) || anchors) as term
  )
  where coalesce(array_length(search_terms, 1), 0) >= 300;

  insert into search_terms (term)
  select term from unnest(anchors) as term
  on conflict (term) do nothing;

  update scheduled_tasks
  set search_terms = array_append(search_terms, '"request for proposal" market activation and awareness campaign Kenya')
  where name = 'Integrated Marketing, Digital Marketing, Social Media, Influencer & Search Visibility'
    and not ('"request for proposal" market activation and awareness campaign Kenya' = any(search_terms));

  update scheduled_tasks
  set search_terms = array_append(search_terms, '"request for proposal" training facilitation curriculum development Kenya')
  where name = 'MEL, Evaluation & Instructional Design'
    and not ('"request for proposal" training facilitation curriculum development Kenya' = any(search_terms));

  update scheduled_tasks
  set search_terms = array_append(search_terms, '"expression of interest" capacity building and leadership development Kenya')
  where name = 'MEL, Evaluation & Instructional Design'
    and not ('"expression of interest" capacity building and leadership development Kenya' = any(search_terms));

  update scheduled_tasks
  set search_terms = array_append(search_terms, '"request for proposal" digital literacy strategy and cybersecurity training Kenya')
  where name = 'Innovation, Cybersecurity, Accessibility & Service Design'
    and not ('"request for proposal" digital literacy strategy and cybersecurity training Kenya' = any(search_terms));

  update scheduled_tasks
  set search_terms = array_append(search_terms, '"request for proposal" community satisfaction survey and baseline research Kenya')
  where name = 'Branding, Data Dashboards & Research Insights'
    and not ('"request for proposal" community satisfaction survey and baseline research Kenya' = any(search_terms));
end $$;
