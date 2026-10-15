-- Read-only installation checks, not a substitute for live account/permission verification.
select 'Atomic connect guard' as check_name,case when to_regprocedure('public.connect_project_github_checked(uuid,uuid,uuid,bigint,bigint,text,text,boolean)') is not null then 'PASS' else 'FAIL' end as status
union all
select 'Stale disconnect guard',case when to_regprocedure('public.disconnect_project_github_checked(uuid,uuid)') is not null then 'PASS' else 'FAIL' end
union all
select 'Atomic webhook deduplication',case when to_regprocedure('public.prepare_project_github_delivery(uuid,bigint,bigint,boolean,bigint[])') is not null then 'PASS' else 'FAIL' end
union all
select 'Delivery table RLS',case when exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='project_github_deliveries' and c.relrowsecurity) then 'PASS' else 'FAIL' end
union all
select 'Client delivery access blocked',case when not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='project_github_deliveries' and grantee in('anon','authenticated','PUBLIC')) then 'PASS' else 'FAIL' end;
