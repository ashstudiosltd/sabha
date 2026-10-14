-- Allow owner/admin invitations for both public and private Clans.
-- Public Clans remain open to join directly; invitations provide a direct path
-- and notify the invitee through the existing Sabha notification center.

create or replace function public.invite_to_clan(p_clan_id uuid, p_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  clan_name text;
  invitation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to invite a member.' using errcode = '28000';
  end if;
  if not public.can_manage_clan(p_clan_id) then
    raise exception 'Only Clan owners and admins can send invitations.' using errcode = '42501';
  end if;

  select c.name into clan_name
  from public.clans c
  where c.id = p_clan_id;
  if clan_name is null then
    raise exception 'This Clan is no longer available.' using errcode = 'P0002';
  end if;

  select p.id into target_id
  from public.profiles p
  where lower(p.username) = lower(btrim(p_username))
  limit 1;
  if target_id is null then
    raise exception 'No Sabha member was found with that username.' using errcode = 'P0002';
  end if;
  if target_id = auth.uid() then
    raise exception 'You are already part of this Clan.' using errcode = '22023';
  end if;
  if public.is_clan_member(p_clan_id, target_id) then
    raise exception 'That member already belongs to this Clan.' using errcode = '23505';
  end if;

  insert into public.clan_invites (clan_id, inviter_id, invitee_id, status, created_at, responded_at)
  values (p_clan_id, auth.uid(), target_id, 'pending', now(), null)
  on conflict (clan_id, invitee_id) do update
    set inviter_id = excluded.inviter_id,
        status = 'pending',
        created_at = now(),
        responded_at = null
  returning id into invitation_id;

  insert into public.notifications (
    recipient_id, actor_id, type, title, message, entity_id, entity_type, target_path, dedupe_key
  ) values (
    target_id,
    auth.uid(),
    'clan_invite',
    'You’re invited to join a Clan',
    'Open the invitation to join ' || clan_name || '.',
    p_clan_id,
    'clan_invite',
    '/feed/clan-invites/' || invitation_id::text,
    'clan-invite:' || invitation_id::text
  )
  on conflict (dedupe_key) do update
    set created_at = now(), read_at = null, title = excluded.title, message = excluded.message;

  return invitation_id;
end;
$$;

create or replace function public.get_clan_invite_context(p_invite_id uuid)
returns table (id uuid, clan_id uuid, clan_slug text, clan_name text, inviter_name text)
language sql
stable
security definer
set search_path = public
as $$
  select i.id,
         c.id,
         c.slug,
         c.name,
         coalesce(p.name, '@' || p.username, 'A Sabha member')
  from public.clan_invites i
  join public.clans c on c.id = i.clan_id
  left join public.profiles p on p.id = i.inviter_id
  where i.id = p_invite_id
    and i.invitee_id = auth.uid()
    and i.status = 'pending';
$$;

revoke all on function public.invite_to_clan(uuid, text) from public;
revoke all on function public.get_clan_invite_context(uuid) from public;
grant execute on function public.invite_to_clan(uuid, text) to authenticated;
grant execute on function public.get_clan_invite_context(uuid) to authenticated;
