select 'Contribution guidance table' as check_name,case when to_regclass('public.project_contribution_guides') is not null then 'PASS' else 'MISSING' end as status
union all
select 'Guidance RLS',case when exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='project_contribution_guides' and c.relrowsecurity) then 'PASS' else 'FAIL' end
union all
select 'Guidance policies',case when (select count(*) from pg_policies where schemaname='public' and tablename='project_contribution_guides' and policyname in ('Read guidance for accessible projects','Create project guidance','Edit project guidance'))=3 then 'PASS' else 'FAIL' end;
