-- Community-wide event invitations can only be approved by a Devvrats admin.
-- The future admin portal can manage this small allow-list.
create table if not exists public.devvrats_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.devvrats_admins enable row level security;
revoke all on public.devvrats_admins from anon, authenticated;
grant all on public.devvrats_admins to service_role;

create or replace function public.is_devvrats_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.devvrats_admins admin
    where admin.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_devvrats_admin() from public;
grant execute on function public.is_devvrats_admin() to authenticated;

create or replace function public.send_anu_event_invites(
  p_event_post_id uuid,
  p_anu_profile_id uuid,
  p_approved_by uuid,
  p_message text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  invited integer := 0;
begin
  if p_event_post_id is null or p_anu_profile_id is null or p_approved_by is null then
    raise exception 'Choose an event announcement and an approving Devvrats admin.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 1 and 240 then
    raise exception 'Invitation notes must be between 1 and 240 characters.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.devvrats_admins where user_id = p_approved_by) then
    raise exception 'Only Devvrats admins can approve community invitations.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = p_anu_profile_id and profile.name = 'Anu' and lower(profile.username) = 'anu'
  ) then
    raise exception 'Anu’s dedicated Sabha profile is not configured.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.feed_posts post
    where post.id = p_event_post_id and post.clan_id is null
  ) then
    raise exception 'Choose a public Feed announcement for this invitation.' using errcode = '22023';
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, title, message,
    entity_id, entity_type, target_path, dedupe_key
  )
  select profile.id, p_anu_profile_id, 'new_feed_post',
    'Anu invited you to a Devvrats event',
    btrim(p_message),
    p_event_post_id, 'feed_post', '/feed/' || p_event_post_id::text,
    'anu-event-invite:' || p_event_post_id::text || ':' || profile.id::text
  from public.profiles profile
  where profile.id <> p_anu_profile_id
  on conflict (dedupe_key) do nothing;

  get diagnostics invited = row_count;
  return invited;
end;
$$;
revoke all on function public.send_anu_event_invites(uuid, uuid, uuid, text) from public;
grant execute on function public.send_anu_event_invites(uuid, uuid, uuid, text) to service_role;
