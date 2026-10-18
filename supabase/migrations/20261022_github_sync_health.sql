begin;
alter table public.project_github_connections add column if not exists sync_error_code text;
alter table public.project_github_connections add column if not exists sync_error_at timestamptz;
-- Keep the existing signature and service-only grants, but reject a stale worker.
create or replace function public.finish_project_github_sync(p_project_id uuid,p_connection_id uuid,p_lease uuid,p_full_name text,p_branch text,p_private boolean,p_stars integer,p_forks integer,p_activity jsonb,p_ready boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.project_github_connections set full_name=p_full_name,default_branch=p_branch,repo_private=p_private,stars=p_stars,forks=p_forks,
 activity=case when p_ready then p_activity else activity end,public_ready=p_ready and not p_private,
 synced_at=case when p_ready then now() else synced_at end,sync_status=case when p_ready then 'ready' else 'pending' end,sync_lease=null,sync_started_at=null,
 sync_error_code=null,sync_error_at=null
 where project_id=p_project_id and connection_id=p_connection_id and sync_lease=p_lease;
 if not found then raise exception 'Repository connection or sync lease changed.' using errcode='40001'; end if;
end;
$$;
revoke all on function public.finish_project_github_sync(uuid,uuid,uuid,text,text,boolean,integer,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.finish_project_github_sync(uuid,uuid,uuid,text,text,boolean,integer,integer,jsonb,boolean) to service_role;
commit;
