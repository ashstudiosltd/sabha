-- Read-only checks: every row should report PASS after applying the foundation.
select 'Project tables' as check_name,
 case when count(*)=4 then 'PASS' else 'FAIL' end as status
from information_schema.tables where table_schema='public' and table_name in('projects','project_members','project_audit_events','project_slug_reservations')
union all
select 'Row level security',case when count(*)=4 then 'PASS' else 'FAIL' end
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('projects','project_members','project_audit_events','project_slug_reservations') and c.relrowsecurity
union all
select 'Client writes blocked',case when not exists(
 select 1 from information_schema.role_table_grants where grantee in('anon','authenticated') and table_schema='public'
 and table_name in('projects','project_members','project_audit_events','project_slug_reservations') and privilege_type in('INSERT','UPDATE','DELETE','TRUNCATE')
) then 'PASS' else 'FAIL' end
union all
select 'Shared profile identity',case when exists(
 select 1 from pg_constraint where conrelid='public.projects'::regclass and confrelid='public.profiles'::regclass and conname='projects_owner_id_fkey'
) then 'PASS' else 'FAIL' end
union all
select 'Project write functions',case when count(*)=8 then 'PASS' else 'FAIL' end
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in('create_project','save_project','set_project_publication','set_project_archived','set_project_member','remove_project_member','transfer_project_ownership','delete_project') and p.prosecdef
union all
select 'Identity and audit triggers',case when count(*)=3 then 'PASS' else 'FAIL' end
from pg_trigger where tgrelid='public.projects'::regclass and tgname in('projects_guard_record','projects_audit','projects_reserve_slug') and not tgisinternal;
