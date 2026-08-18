-- Makes GMB/LinkedIn/Reddit lead searches selectable as scheduled task types, same as the
-- existing tender sources — startTaskRun.ts routes these three by name (see that file).
-- No unique constraint on tendertypes.name, so guard against re-running this manually instead
-- of relying on ON CONFLICT.
insert into tendertypes (name)
select v.name from (values ('Google Maps Leads'), ('LinkedIn People Leads'), ('Reddit Mentions')) as v(name)
where not exists (select 1 from tendertypes t where t.name = v.name);
