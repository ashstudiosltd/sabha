begin;
create table if not exists public.project_github_connections (
 project_id uuid primary key references public.projects(id) on delete cascade,
 connection_id uuid not null default gen_random_uuid(),
 installation_id bigint not null check(installation_id>0),
 repository_id bigint not null check(repository_id>0),
 full_name text not null,
 default_branch text not null,
 repo_private boolean not null default true,
 public_ready boolean not null default false,
 stars integer not null default 0 check(stars>=0),
 forks integer not null default 0 check(forks>=0),
 activity jsonb not null default '[]'::jsonb check(jsonb_typeof(activity)='array'),
 sync_status text not null default 'pending' check(sync_status in ('pending','ready','unavailable')),
 synced_at timestamptz,
 sync_lease uuid,
 sync_started_at timestamptz,
 last_attempt_at timestamptz,
 connected_by uuid references public.profiles(id) on delete set null,
 connected_at timestamptz not null default now()
);
create index if not exists project_github_repository_idx on public.project_github_connections(installation_id,repository_id);
create index if not exists project_github_sync_idx on public.project_github_connections(synced_at nulls first);
alter table public.project_github_connections enable row level security;
revoke all on public.project_github_connections from public,anon,authenticated;
grant all on public.project_github_connections to service_role;
create or replace function public.project_github_summary(p_project_id uuid)
returns table(activity jsonb,stars integer,forks integer,synced_at timestamptz,sync_status text)
language sql stable security definer set search_path='' as $$
 select g.activity,g.stars,g.forks,g.synced_at,g.sync_status
 from public.project_github_connections g join public.projects p on p.id=g.project_id
 where g.project_id=p_project_id and public.can_read_project(p.id) and (
  p.owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=p.id and m.profile_id=auth.uid())
  or (not g.repo_private and g.public_ready and g.sync_status='ready' and g.synced_at>now()-interval '2 hours')
 );
$$;
create or replace function public.connect_project_github(p_project_id uuid,p_owner_id uuid,p_installation_id bigint,p_repository_id bigint,p_full_name text,p_default_branch text,p_private boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_connection uuid:=gen_random_uuid();
begin
 perform 1 from public.projects where id=p_project_id and owner_id=p_owner_id and archived_at is null for update;
 if not found then raise exception 'Only the current owner can connect an active project.' using errcode='42501'; end if;
 insert into public.project_github_connections(project_id,connection_id,installation_id,repository_id,full_name,default_branch,repo_private,connected_by)
 values(p_project_id,v_connection,p_installation_id,p_repository_id,p_full_name,p_default_branch,p_private,p_owner_id)
 on conflict(project_id) do update set connection_id=v_connection,installation_id=excluded.installation_id,repository_id=excluded.repository_id,full_name=excluded.full_name,default_branch=excluded.default_branch,repo_private=excluded.repo_private,public_ready=false,activity='[]',stars=0,forks=0,synced_at=null,sync_status='pending',connected_by=p_owner_id,connected_at=now(),sync_lease=null,sync_started_at=null,last_attempt_at=null;
 return v_connection;
end;
$$;
create or replace function public.disconnect_project_github(p_project_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.projects where id=p_project_id and owner_id=auth.uid() and archived_at is null for update;
 if not found then raise exception 'Only the current owner can disconnect an active project.' using errcode='42501'; end if;
 delete from public.project_github_connections where project_id=p_project_id;
end;
$$;
revoke all on function public.project_github_summary(uuid),public.connect_project_github(uuid,uuid,bigint,bigint,text,text,boolean),public.disconnect_project_github(uuid) from public,anon,authenticated;
grant execute on function public.project_github_summary(uuid) to anon,authenticated;
grant execute on function public.connect_project_github(uuid,uuid,bigint,bigint,text,text,boolean) to service_role;
grant execute on function public.disconnect_project_github(uuid) to authenticated;
create or replace function public.claim_project_github_sync(p_project_id uuid,p_connection_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_lease uuid:=gen_random_uuid(); v_found uuid;
begin
 update public.project_github_connections set sync_lease=v_lease,sync_started_at=now(),last_attempt_at=now()
 where project_id=p_project_id and connection_id=p_connection_id and (sync_started_at is null or sync_started_at<now()-interval '2 minutes') and (last_attempt_at is null or last_attempt_at<now()-interval '1 minute') returning project_id into v_found;
 return case when v_found is null then null else v_lease end;
end;
$$;
create or replace function public.finish_project_github_sync(p_project_id uuid,p_connection_id uuid,p_lease uuid,p_full_name text,p_branch text,p_private boolean,p_stars integer,p_forks integer,p_activity jsonb,p_ready boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.project_github_connections set full_name=p_full_name,default_branch=p_branch,repo_private=p_private,stars=p_stars,forks=p_forks,
 activity=case when p_ready then p_activity else activity end,public_ready=p_ready and not p_private,
 synced_at=case when p_ready then now() else synced_at end,sync_status=case when p_ready then 'ready' else 'pending' end,sync_lease=null,sync_started_at=null
 where project_id=p_project_id and connection_id=p_connection_id and sync_lease=p_lease;
end;
$$;
revoke all on function public.claim_project_github_sync(uuid,uuid),public.finish_project_github_sync(uuid,uuid,uuid,text,text,boolean,integer,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.claim_project_github_sync(uuid,uuid),public.finish_project_github_sync(uuid,uuid,uuid,text,text,boolean,integer,integer,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
commit;
