-- Run after the existing Clan migrations. All operations use the signed-in user.
begin;
alter table public.clans add column if not exists archived_at timestamptz;

create or replace function public.get_clan_pending_invites(p_clan_id uuid)
returns table(id uuid, username text, name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_manage_clan(p_clan_id) then raise exception 'Only owners and admins can review invitations.' using errcode = '42501'; end if;
  return query select i.id, p.username, p.name, i.created_at
    from public.clan_invites i left join public.profiles p on p.id = i.invitee_id
    where i.clan_id = p_clan_id and i.status = 'pending' order by i.created_at desc;
end;
$$;

create or replace function public.revoke_clan_invite(p_clan_id uuid, p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_clan(p_clan_id) then raise exception 'Only owners and admins can revoke invitations.' using errcode = '42501'; end if;
  -- Deletion invalidates the acceptance link and allows a fresh invitation later.
  delete from public.clan_invites where id = p_invite_id and clan_id = p_clan_id and status = 'pending';
  if not found then raise exception 'This invitation is no longer pending.' using errcode = 'P0002'; end if;
  delete from public.notifications where dedupe_key = 'clan-invite:' || p_invite_id::text;
end;
$$;

create or replace function public.transfer_clan_ownership(p_clan_id uuid, p_user_id uuid, p_confirmation text)
returns void language plpgsql security definer set search_path = public as $$
declare clan_row public.clans%rowtype; target_role text;
begin
  select * into clan_row from public.clans where id = p_clan_id for update;
  if not found or clan_row.created_by is distinct from auth.uid() then raise exception 'Only the owner can transfer this Clan.' using errcode = '42501'; end if;
  if p_confirmation is distinct from clan_row.name then raise exception 'Enter the Clan name to confirm.' using errcode = '22023'; end if;
  if p_user_id = auth.uid() then raise exception 'Choose another member.' using errcode = '22023'; end if;
  select role into target_role from public.clan_members where clan_id = p_clan_id and user_id = p_user_id for update;
  if target_role is null or target_role = 'owner' then raise exception 'Choose an existing Clan member.' using errcode = '22023'; end if;
  update public.clan_members set role = 'admin' where clan_id = p_clan_id and user_id = auth.uid();
  update public.clan_members set role = 'owner' where clan_id = p_clan_id and user_id = p_user_id;
  update public.clans set created_by = p_user_id where id = p_clan_id;
end;
$$;

create or replace function public.set_clan_archived(p_clan_id uuid, p_archived boolean, p_confirmation text)
returns void language plpgsql security definer set search_path = public as $$
declare clan_row public.clans%rowtype;
begin
  select * into clan_row from public.clans where id = p_clan_id for update;
  if not found or clan_row.created_by is distinct from auth.uid() then raise exception 'Only the owner can archive or restore this Clan.' using errcode = '42501'; end if;
  if p_confirmation is distinct from clan_row.name then raise exception 'Enter the Clan name to confirm.' using errcode = '22023'; end if;
  update public.clans set archived_at = case when p_archived then now() else null end where id = p_clan_id;
end;
$$;

-- Serialize existing role/removal controls with ownership transfers.
create or replace function public.set_clan_member_role(p_clan_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare current_role text;
begin
  perform 1 from public.clans where id = p_clan_id for update;
  if not exists (select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only the Clan owner can change member roles.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'moderator', 'member') then raise exception 'Choose a valid role.' using errcode = '22023'; end if;
  select role into current_role from public.clan_members where clan_id = p_clan_id and user_id = p_user_id for update;
  if current_role is null or current_role = 'owner' then raise exception 'That member role cannot be changed.' using errcode = '22023'; end if;
  update public.clan_members set role = p_role where clan_id = p_clan_id and user_id = p_user_id;
end;
$$;
create or replace function public.remove_clan_member(p_clan_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.clans where id = p_clan_id for update;
  if not public.can_remove_clan_member(p_clan_id, p_user_id) then raise exception 'You do not have permission to remove this member.' using errcode = '42501'; end if;
  delete from public.clan_members where clan_id = p_clan_id and user_id = p_user_id;
end;
$$;

-- Enforce read-only archives even when clients bypass the UI or use old links.
create or replace function public.enforce_clan_archive()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_clan uuid; previous_clan uuid; archived timestamptz;
begin
  if tg_table_name in ('feed_replies', 'feed_comments') then
    select clan_id into target_clan from public.feed_posts where id = new.post_id;
  else target_clan := new.clan_id;
  end if;
  if tg_op = 'UPDATE' then
    if tg_table_name in ('feed_replies', 'feed_comments') then
      select clan_id into previous_clan from public.feed_posts where id = old.post_id;
    else previous_clan := old.clan_id;
    end if;
  end if;
  -- Lock both old and new destinations so archived content cannot be moved out.
  for archived in select archived_at from public.clans where id in (target_clan, previous_clan) order by id for share loop
    if archived is not null then raise exception 'This Clan is archived and read-only.' using errcode = '55000'; end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists enforce_clan_archive on public.feed_posts;
create trigger enforce_clan_archive before insert or update on public.feed_posts for each row execute function public.enforce_clan_archive();
drop trigger if exists enforce_clan_archive on public.feed_replies;
create trigger enforce_clan_archive before insert or update on public.feed_replies for each row execute function public.enforce_clan_archive();
drop trigger if exists enforce_clan_archive on public.feed_comments;
create trigger enforce_clan_archive before insert or update on public.feed_comments for each row execute function public.enforce_clan_archive();
drop trigger if exists enforce_clan_archive on public.clan_members;
create trigger enforce_clan_archive before insert on public.clan_members for each row execute function public.enforce_clan_archive();
drop trigger if exists enforce_clan_archive on public.clan_invites;
create trigger enforce_clan_archive before insert or update on public.clan_invites for each row when (new.status = 'pending') execute function public.enforce_clan_archive();

revoke all on function public.get_clan_pending_invites(uuid), public.revoke_clan_invite(uuid, uuid), public.transfer_clan_ownership(uuid, uuid, text), public.set_clan_archived(uuid, boolean, text), public.enforce_clan_archive() from public;
grant execute on function public.get_clan_pending_invites(uuid), public.revoke_clan_invite(uuid, uuid), public.transfer_clan_ownership(uuid, uuid, text), public.set_clan_archived(uuid, boolean, text) to authenticated;
commit;
