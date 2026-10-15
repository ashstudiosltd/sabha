begin;
create table if not exists public.project_github_deliveries (
 delivery_id uuid primary key,
 received_at timestamptz not null default now()
);
alter table public.project_github_deliveries enable row level security;
revoke all on public.project_github_deliveries from public,anon,authenticated;
grant all on public.project_github_deliveries to service_role;
create index if not exists project_github_delivery_age_idx on public.project_github_deliveries(received_at);
create or replace function public.connect_project_github_checked(p_project_id uuid,p_owner_id uuid,p_expected_connection uuid,p_installation_id bigint,p_repository_id bigint,p_full_name text,p_default_branch text,p_private boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_connection uuid;
begin
 perform 1 from public.projects where id=p_project_id and owner_id=p_owner_id and archived_at is null for update;
 if not found then raise exception 'Only the current owner can connect this project.' using errcode='42501'; end if;
 select connection_id into current_connection from public.project_github_connections where project_id=p_project_id;
 if current_connection is distinct from p_expected_connection then raise exception 'The connection changed. Authorize again before replacing it.' using errcode='40001'; end if;
 return public.connect_project_github(p_project_id,p_owner_id,p_installation_id,p_repository_id,p_full_name,p_default_branch,p_private);
end;
$$;
create or replace function public.disconnect_project_github_checked(p_project_id uuid,p_expected_connection uuid)
returns void language plpgsql security definer set search_path='' as $$
declare current_connection uuid;
begin
 perform 1 from public.projects where id=p_project_id and owner_id=auth.uid() and archived_at is null for update;
 if not found then raise exception 'Only the owner can disconnect this project.' using errcode='42501'; end if;
 select connection_id into current_connection from public.project_github_connections where project_id=p_project_id;
 if current_connection is distinct from p_expected_connection then raise exception 'The connection changed. Reload before disconnecting.' using errcode='40001'; end if;
 delete from public.project_github_connections where project_id=p_project_id;
end;
$$;
-- Recording a delivery and invalidating snapshots happen together: failed work can be redelivered.
create or replace function public.prepare_project_github_delivery(p_delivery_id uuid,p_installation_id bigint,p_repository_id bigint,p_revoked boolean,p_removed_ids bigint[])
returns setof public.project_github_connections language plpgsql security definer set search_path='' as $$
begin
 insert into public.project_github_deliveries(delivery_id) values(p_delivery_id) on conflict do nothing;
 if not found then return; end if;
 return query update public.project_github_connections g set public_ready=false,
 sync_status=case when p_revoked or g.repository_id=any(coalesce(p_removed_ids,'{}')) then 'unavailable' else 'pending' end,
 sync_lease=null,sync_started_at=null
 where g.installation_id=p_installation_id and (p_repository_id is null or g.repository_id=p_repository_id) returning g.*;
end;
$$;
revoke all on function public.connect_project_github_checked(uuid,uuid,uuid,bigint,bigint,text,text,boolean),public.disconnect_project_github_checked(uuid,uuid),public.prepare_project_github_delivery(uuid,bigint,bigint,boolean,bigint[]) from public,anon,authenticated;
grant execute on function public.connect_project_github_checked(uuid,uuid,uuid,bigint,bigint,text,text,boolean),public.prepare_project_github_delivery(uuid,bigint,bigint,boolean,bigint[]) to service_role;
grant execute on function public.disconnect_project_github_checked(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
