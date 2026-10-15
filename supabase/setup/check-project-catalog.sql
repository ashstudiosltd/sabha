-- Read-only setup inspection; functional access checks require signed-in/anonymous app sessions.
select 'Discovery function' as check_name,case when to_regprocedure('public.search_project_catalog(text,text,text,text,text,text,text,jsonb,integer)') is not null then 'PASS' else 'FAIL' end as status
union all
select 'Workspace totals',case when to_regprocedure('public.project_workspace_counts()') is not null then 'PASS' else 'FAIL' end
union all
select 'Functions respect caller RLS',case when (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('search_project_catalog','project_workspace_counts') and not p.prosecdef)=2 then 'PASS' else 'FAIL' end
union all
select 'Public discovery index',case when to_regclass('public.projects_public_updated_idx') is not null then 'PASS' else 'FAIL' end;
