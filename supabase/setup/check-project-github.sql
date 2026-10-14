-- Run after 20261017_project_github.sql. This query changes no data.
select 'Connection table' as check_name,
 case when to_regclass('public.project_github_connections') is not null then 'PASS' else 'FAIL' end as status
union all
select 'Row level security',case when exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='project_github_connections' and c.relrowsecurity) then 'PASS' else 'FAIL' end
union all
select 'Client table access blocked',case when not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='project_github_connections' and grantee in ('anon','authenticated','PUBLIC')) then 'PASS' else 'FAIL' end
union all
select 'Summary function',case when to_regprocedure('public.project_github_summary(uuid)') is not null then 'PASS' else 'FAIL' end
union all
select 'Owner disconnect function',case when to_regprocedure('public.disconnect_project_github(uuid)') is not null then 'PASS' else 'FAIL' end
union all
select 'Connection and sync service-only',case when
 not exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name in ('connect_project_github','claim_project_github_sync','finish_project_github_sync') and grantee in ('anon','authenticated','PUBLIC'))
 and to_regprocedure('public.connect_project_github(uuid,uuid,bigint,bigint,text,text,boolean)') is not null
 and to_regprocedure('public.claim_project_github_sync(uuid,uuid)') is not null
 and to_regprocedure('public.finish_project_github_sync(uuid,uuid,uuid,text,text,boolean,integer,integer,jsonb,boolean)') is not null then 'PASS' else 'FAIL' end;
