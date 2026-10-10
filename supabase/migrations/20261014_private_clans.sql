-- Sabha Clans v2: private membership, invitations, lightweight moderation and avatars.

alter table public.clans
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  add column if not exists avatar_url text
    check (avatar_url is null or (avatar_url ~* '^https://' and char_length(avatar_url) <= 2048));

alter table public.clan_members drop constraint if exists clan_members_role_check;
alter table public.clan_members
  add constraint clan_members_role_check check (role in ('owner', 'admin', 'moderator', 'member'));

create table if not exists public.clan_invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (clan_id, invitee_id),
  check (inviter_id <> invitee_id)
);
create index if not exists clan_invites_invitee_pending_idx
  on public.clan_invites (invitee_id, created_at desc) where status = 'pending';
create index if not exists clan_invites_clan_status_idx
  on public.clan_invites (clan_id, status, created_at desc);

alter table public.clan_invites enable row level security;
grant select on public.clan_invites to authenticated;
drop policy if exists "Members can read their Clan invitations" on public.clan_invites;
create policy "Members can read their Clan invitations"
  on public.clan_invites for select to authenticated
  using (invitee_id = (select auth.uid()));

create or replace function public.is_clan_member(target_clan_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clan_members m
    where m.clan_id = target_clan_id and m.user_id = target_user_id
  );
$$;

create or replace function public.is_public_clan(p_clan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clans c where c.id = p_clan_id and c.visibility = 'public');
$$;

create or replace function public.can_manage_clan(p_clan_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clan_members m
    where m.clan_id = p_clan_id and m.user_id = p_user_id and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.can_remove_clan_member(p_clan_id uuid, p_target_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clan_members actor
    join public.clan_members target on target.clan_id = actor.clan_id
    where actor.clan_id = p_clan_id and target.user_id = p_target_id
      and actor.user_id = p_user_id and target.role <> 'owner'
      and (actor.role = 'owner' or (actor.role = 'admin' and target.role in ('moderator', 'member')))
  );
$$;

create or replace function public.can_moderate_clan(p_clan_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clan_members m
    where m.clan_id = p_clan_id and m.user_id = p_user_id and m.role in ('owner', 'admin', 'moderator')
  );
$$;

create or replace function public.can_read_feed_post(p_post_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.feed_posts p
    where p.id = p_post_id
      and (p.clan_id is null or public.is_public_clan(p.clan_id) or public.is_clan_member(p.clan_id, p_user_id))
  );
$$;

revoke all on function public.is_clan_member(uuid, uuid) from public;
revoke all on function public.is_public_clan(uuid) from public;
revoke all on function public.can_manage_clan(uuid, uuid) from public;
revoke all on function public.can_remove_clan_member(uuid, uuid, uuid) from public;
revoke all on function public.can_moderate_clan(uuid, uuid) from public;
revoke all on function public.can_read_feed_post(uuid, uuid) from public;
grant execute on function public.is_clan_member(uuid, uuid) to authenticated;
grant execute on function public.is_public_clan(uuid) to anon, authenticated;
grant execute on function public.can_manage_clan(uuid, uuid) to authenticated;
grant execute on function public.can_remove_clan_member(uuid, uuid, uuid) to authenticated;
grant execute on function public.can_moderate_clan(uuid, uuid) to authenticated;
grant execute on function public.can_read_feed_post(uuid, uuid) to authenticated;

drop policy if exists "Anyone can read public Clans" on public.clans;
drop policy if exists "Members can discover public Clans and read joined private Clans" on public.clans;
drop policy if exists "Anyone can discover public Clans" on public.clans;
create policy "Members can discover public Clans and read joined private Clans"
  on public.clans for select to authenticated
  using (visibility = 'public' or public.is_clan_member(id));
create policy "Anyone can discover public Clans"
  on public.clans for select to anon using (visibility = 'public');

drop policy if exists "Clan owners can update their Clans" on public.clans;
drop policy if exists "Clan owners and admins can update their Clans" on public.clans;
create policy "Clan owners and admins can update their Clans"
  on public.clans for update to authenticated
  using (public.can_manage_clan(id))
  with check (public.can_manage_clan(id));
drop policy if exists "Clan owners can delete their Clans" on public.clans;
drop policy if exists "Only Clan owners can delete their Clans" on public.clans;
create policy "Only Clan owners can delete their Clans"
  on public.clans for delete to authenticated
  using (created_by = (select auth.uid()));
grant update (name, description, visibility, avatar_url) on public.clans to authenticated;

drop policy if exists "Public Clan memberships are visible" on public.clan_members;
drop policy if exists "Public rosters and joined private rosters are visible" on public.clan_members;
drop policy if exists "Public Clan rosters are visible to visitors" on public.clan_members;
create policy "Public rosters and joined private rosters are visible"
  on public.clan_members for select to authenticated
  using (public.is_public_clan(clan_id) or public.is_clan_member(clan_id));
create policy "Public Clan rosters are visible to visitors"
  on public.clan_members for select to anon
  using (public.is_public_clan(clan_id));

drop policy if exists "Members can join a Clan as themselves" on public.clan_members;
drop policy if exists "Members can join public Clans as themselves" on public.clan_members;
create policy "Members can join public Clans as themselves"
  on public.clan_members for insert to authenticated
  with check (
    user_id = (select auth.uid()) and role = 'member' and public.is_public_clan(clan_id)
  );
drop policy if exists "Members can leave their Clan" on public.clan_members;
drop policy if exists "Members can leave and managers can remove members" on public.clan_members;
create policy "Members can leave and managers can remove members"
  on public.clan_members for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or public.can_remove_clan_member(clan_id, user_id)
  );
drop policy if exists "Clan owners can manage member roles" on public.clan_members;
revoke update on public.clan_members from authenticated;

drop policy if exists "Members can read Feed posts" on public.feed_posts;
drop policy if exists "Members can read public and joined Clan posts" on public.feed_posts;
create policy "Members can read public and joined Clan posts"
  on public.feed_posts for select to authenticated
  using (clan_id is null or public.is_public_clan(clan_id) or public.is_clan_member(clan_id));
drop policy if exists "Members can publish their own Feed posts" on public.feed_posts;
drop policy if exists "Members can publish Feed and joined Clan posts" on public.feed_posts;
create policy "Members can publish Feed and joined Clan posts"
  on public.feed_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (clan_id is null or public.is_clan_member(clan_id)));
drop policy if exists "Authors can edit their Feed posts" on public.feed_posts;
drop policy if exists "Authors and Clan managers can edit Feed posts" on public.feed_posts;
create policy "Authors and Clan managers can edit Feed posts"
  on public.feed_posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and (clan_id is null or public.is_clan_member(clan_id)));
drop policy if exists "Authors can delete their Feed posts" on public.feed_posts;
drop policy if exists "Authors and Clan managers can delete Feed posts" on public.feed_posts;
create policy "Authors and Clan managers can delete Feed posts"
  on public.feed_posts for delete to authenticated
  using (author_id = (select auth.uid()) or (clan_id is not null and public.can_moderate_clan(clan_id)));

drop policy if exists "Members can read Feed replies" on public.feed_replies;
drop policy if exists "Members can read replies to visible Feed posts" on public.feed_replies;
create policy "Members can read replies to visible Feed posts"
  on public.feed_replies for select to authenticated
  using (public.can_read_feed_post(post_id));
drop policy if exists "Members can reply as themselves" on public.feed_replies;
drop policy if exists "Members can reply to visible Feed posts" on public.feed_replies;
create policy "Members can reply to visible Feed posts"
  on public.feed_replies for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_read_feed_post(post_id));
drop policy if exists "Authors can edit their Feed replies" on public.feed_replies;
drop policy if exists "Authors and Clan managers can edit Feed replies" on public.feed_replies;
create policy "Authors and Clan managers can edit Feed replies"
  on public.feed_replies for update to authenticated
  using (author_id = (select auth.uid()) and public.can_read_feed_post(post_id))
  with check (author_id = (select auth.uid()) and public.can_read_feed_post(post_id));
drop policy if exists "Authors can delete their Feed replies" on public.feed_replies;
drop policy if exists "Authors and Clan managers can delete Feed replies" on public.feed_replies;
create policy "Authors and Clan managers can delete Feed replies"
  on public.feed_replies for delete to authenticated
  using (author_id = (select auth.uid()) or exists (
    select 1 from public.feed_posts p where p.id = post_id and p.clan_id is not null and public.can_moderate_clan(p.clan_id)
  ));

drop policy if exists "Members can read Feed comments" on public.feed_comments;
drop policy if exists "Members can read comments on visible Feed posts" on public.feed_comments;
create policy "Members can read comments on visible Feed posts"
  on public.feed_comments for select to authenticated
  using (public.can_read_feed_post(post_id));
drop policy if exists "Members can comment as themselves" on public.feed_comments;
drop policy if exists "Members can comment on visible Feed posts" on public.feed_comments;
create policy "Members can comment on visible Feed posts"
  on public.feed_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_read_feed_post(post_id));
drop policy if exists "Authors can edit their Feed comments" on public.feed_comments;
drop policy if exists "Authors and Clan managers can edit Feed comments" on public.feed_comments;
create policy "Authors and Clan managers can edit Feed comments"
  on public.feed_comments for update to authenticated
  using (author_id = (select auth.uid()) and public.can_read_feed_post(post_id))
  with check (author_id = (select auth.uid()) and public.can_read_feed_post(post_id));
drop policy if exists "Authors can delete their Feed comments" on public.feed_comments;
drop policy if exists "Authors and Clan managers can delete Feed comments" on public.feed_comments;
create policy "Authors and Clan managers can delete Feed comments"
  on public.feed_comments for delete to authenticated
  using (author_id = (select auth.uid()) or exists (
    select 1 from public.feed_posts p where p.id = post_id and p.clan_id is not null and public.can_moderate_clan(p.clan_id)
  ));

drop function if exists public.get_public_clan_summaries();
create function public.get_public_clan_summaries()
returns table (id uuid, slug text, name text, description text, created_by uuid, created_at timestamptz, member_count bigint, avatar_url text, visibility text)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.description, c.created_by, c.created_at,
    (select count(*) from public.clan_members m where m.clan_id = c.id), c.avatar_url, c.visibility
  from public.clans c where c.visibility = 'public' order by c.created_at desc;
$$;

create or replace function public.get_my_private_clan_summaries()
returns table (id uuid, slug text, name text, description text, created_by uuid, created_at timestamptz, member_count bigint, avatar_url text, visibility text)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.description, c.created_by, c.created_at,
    (select count(*) from public.clan_members m where m.clan_id = c.id), c.avatar_url, c.visibility
  from public.clans c join public.clan_members mine on mine.clan_id = c.id
  where c.visibility = 'private' and mine.user_id = auth.uid()
  order by c.created_at desc;
$$;
revoke all on function public.get_public_clan_summaries() from public;
revoke all on function public.get_my_private_clan_summaries() from public;
grant execute on function public.get_public_clan_summaries() to anon, authenticated;
grant execute on function public.get_my_private_clan_summaries() to authenticated;

drop function if exists public.create_clan(text, text, text);
drop function if exists public.create_clan(text, text, text, text, text);
create function public.create_clan(p_name text, p_slug text, p_description text default '', p_visibility text default 'public', p_avatar_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_clan_id uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in to create a Clan.' using errcode = '28000'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 then raise exception 'Clan names must be between 2 and 60 characters.' using errcode = '22023'; end if;
  if char_length(coalesce(p_description, '')) > 1000 then raise exception 'Clan descriptions must be 1000 characters or fewer.' using errcode = '22023'; end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Choose a valid Clan URL.' using errcode = '22023'; end if;
  if p_visibility not in ('public', 'private') then raise exception 'Choose public or private visibility.' using errcode = '22023'; end if;
  if p_avatar_url is not null and (p_avatar_url !~* '^https://' or char_length(p_avatar_url) > 2048) then raise exception 'Clan avatar must be a valid HTTPS URL.' using errcode = '22023'; end if;
  insert into public.clans (name, slug, description, created_by, visibility, avatar_url)
  values (btrim(p_name), p_slug, btrim(coalesce(p_description, '')), auth.uid(), p_visibility, nullif(btrim(p_avatar_url), ''))
  returning id into new_clan_id;
  return new_clan_id;
end;
$$;
revoke all on function public.create_clan(text, text, text, text, text) from public;
grant execute on function public.create_clan(text, text, text, text, text) to authenticated;

create or replace function public.invite_to_clan(p_clan_id uuid, p_username text)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_id uuid; clan_slug text; invitation_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to invite a member.' using errcode = '28000'; end if;
  if not public.can_manage_clan(p_clan_id) then raise exception 'Only Clan owners and admins can send invitations.' using errcode = '42501'; end if;
  select c.slug into clan_slug from public.clans c where c.id = p_clan_id and c.visibility = 'private';
  if clan_slug is null then raise exception 'Invitations are available for private Clans.' using errcode = '22023'; end if;
  select p.id into target_id from public.profiles p where lower(p.username) = lower(btrim(p_username)) limit 1;
  if target_id is null then raise exception 'No Sabha member was found with that username.' using errcode = 'P0002'; end if;
  if target_id = auth.uid() then raise exception 'You are already a member of this Clan.' using errcode = '22023'; end if;
  if public.is_clan_member(p_clan_id, target_id) then raise exception 'That member already belongs to this Clan.' using errcode = '23505'; end if;
  insert into public.clan_invites (clan_id, inviter_id, invitee_id, status, created_at, responded_at)
  values (p_clan_id, auth.uid(), target_id, 'pending', now(), null)
  on conflict (clan_id, invitee_id) do update set inviter_id = excluded.inviter_id, status = 'pending', created_at = now(), responded_at = null
  returning id into invitation_id;
  insert into public.notifications (recipient_id, actor_id, type, title, message, entity_id, entity_type, target_path, dedupe_key)
  values (target_id, auth.uid(), 'clan_invite', 'You’re invited to a private Clan', 'Open the invitation to join ' || (select c.name from public.clans c where c.id = p_clan_id) || '.', p_clan_id, 'clan_invite', '/feed/clan-invites/' || invitation_id::text, 'clan-invite:' || invitation_id::text)
  on conflict (dedupe_key) do update set created_at = now(), read_at = null;
  return invitation_id;
end;
$$;

create or replace function public.get_clan_invite_context(p_invite_id uuid)
returns table (id uuid, clan_id uuid, clan_slug text, clan_name text, inviter_name text)
language sql stable security definer set search_path = public as $$
  select i.id, c.id, c.slug, c.name, coalesce(p.name, '@' || p.username, 'A Sabha member')
  from public.clan_invites i join public.clans c on c.id = i.clan_id
  left join public.profiles p on p.id = i.inviter_id
  where i.id = p_invite_id and i.invitee_id = auth.uid() and i.status = 'pending' and c.visibility = 'private';
$$;

create or replace function public.respond_to_clan_invite(p_invite_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare invite_row public.clan_invites%rowtype; clan_slug text;
begin
  if auth.uid() is null then raise exception 'Sign in to respond to this invitation.' using errcode = '28000'; end if;
  select * into invite_row from public.clan_invites where id = p_invite_id and invitee_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'This invitation is no longer available.' using errcode = 'P0002'; end if;
  select slug into clan_slug from public.clans where id = invite_row.clan_id;
  if p_accept then
    insert into public.clan_members (clan_id, user_id, role) values (invite_row.clan_id, auth.uid(), 'member') on conflict do nothing;
    update public.clan_invites set status = 'accepted', responded_at = now() where id = p_invite_id;
    insert into public.notifications (recipient_id, actor_id, type, title, message, entity_id, entity_type, target_path, dedupe_key)
    values (invite_row.inviter_id, auth.uid(), 'clan_join_accepted', 'Your Clan invitation was accepted', 'A member joined your private Clan.', invite_row.clan_id, 'clan', '/feed/clans/' || clan_slug, 'clan-accepted:' || p_invite_id::text)
    on conflict (dedupe_key) do nothing;
  else
    update public.clan_invites set status = 'declined', responded_at = now() where id = p_invite_id;
  end if;
  return clan_slug;
end;
$$;

create or replace function public.set_clan_member_role(p_clan_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare current_role text;
begin
  if not exists (select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only the Clan owner can change admin roles.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'moderator', 'member') then raise exception 'Choose a valid member role.' using errcode = '22023'; end if;
  select role into current_role from public.clan_members where clan_id = p_clan_id and user_id = p_user_id;
  if current_role is null or current_role = 'owner' then raise exception 'That member role cannot be changed.' using errcode = '22023'; end if;
  update public.clan_members set role = p_role where clan_id = p_clan_id and user_id = p_user_id;
end;
$$;

create or replace function public.remove_clan_member(p_clan_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_remove_clan_member(p_clan_id, p_user_id) then
    raise exception 'You do not have permission to remove this member.' using errcode = '42501';
  end if;
  delete from public.clan_members where clan_id = p_clan_id and user_id = p_user_id;
end;
$$;

create or replace function public.get_profile_public_clan_count(p_profile_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.clan_members m join public.clans c on c.id = m.clan_id
  where m.user_id = p_profile_id and c.visibility = 'public';
$$;

create or replace function public.notify_feed_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; post_clan uuid; clan_slug text; target_path text;
begin
  select post.author_id, post.clan_id, clan.slug into post_author, post_clan, clan_slug
  from public.feed_posts post left join public.clans clan on clan.id = post.clan_id
  where post.id = new.post_id;
  target_path := case when post_clan is null then '/feed/' || new.post_id::text else '/feed/clans/' || clan_slug end;
  perform public.emit_notification(post_author, new.author_id, 'feed_reply', 'New reply to your Feed post', null, new.post_id, 'feed_post', target_path, 'feed-reply:' || new.id::text);
  return new;
end;
$$;

create or replace function public.notify_feed_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; post_clan uuid; clan_slug text; target_path text;
begin
  select post.author_id, post.clan_id, clan.slug into post_author, post_clan, clan_slug
  from public.feed_posts post left join public.clans clan on clan.id = post.clan_id
  where post.id = new.post_id;
  target_path := case when post_clan is null then '/feed/' || new.post_id::text else '/feed/clans/' || clan_slug end;
  perform public.emit_notification(post_author, new.author_id, 'feed_comment', 'New comment on your Feed post', null, new.post_id, 'feed_post', target_path, 'feed-comment:' || new.id::text);
  return new;
end;
$$;

-- Share cards and public profile activity are separate SECURITY DEFINER RPCs.
-- Filter private Clan content here as well as in the table RLS policies.
create or replace function public.get_feed_post_for_share(p_post_id uuid)
returns table (
  id uuid, post_type text, title text, body text, resource_kind text,
  resource_url text, resource_label text, created_at timestamptz,
  author_name text, author_username text, author_avatar_url text
)
language sql stable security definer set search_path = public as $$
  select post.id, post.post_type, post.title, post.body, post.resource_kind,
    post.resource_url, post.resource_label, post.created_at,
    coalesce(profile.name, 'Community member'), coalesce(profile.username, 'member'), profile.avatar_url
  from public.feed_posts post
  left join public.profiles profile on profile.id = post.author_id
  where post.id = p_post_id
    and (post.clan_id is null or public.is_public_clan(post.clan_id) or public.is_clan_member(post.clan_id, auth.uid()))
  limit 1;
$$;

create or replace function public.get_feed_profile_activity(p_profile_id uuid)
returns table (
  id uuid, activity_type text, post_id uuid, post_type text, title text, body text,
  created_at timestamptz, resource_kind text, resource_url text, resource_label text,
  parent_title text, parent_body text, parent_author_name text, parent_author_username text
)
language sql stable security definer set search_path = public as $$
  select post.id, 'post'::text, post.id, post.post_type, post.title, post.body,
    post.created_at, post.resource_kind, post.resource_url, post.resource_label,
    null::text, null::text, null::text, null::text
  from public.feed_posts post
  where post.author_id = p_profile_id
    and (post.clan_id is null or public.is_public_clan(post.clan_id) or public.is_clan_member(post.clan_id, auth.uid()))
  union all
  select reply.id, 'reply'::text, post.id, post.post_type, post.title, reply.body,
    reply.created_at, post.resource_kind, post.resource_url, post.resource_label,
    post.title, post.body,
    coalesce(parent_profile.name, 'Community member'), coalesce(parent_profile.username, 'member')
  from public.feed_replies reply
  join public.feed_posts post on post.id = reply.post_id
  left join public.profiles parent_profile on parent_profile.id = post.author_id
  where reply.author_id = p_profile_id
    and (post.clan_id is null or public.is_public_clan(post.clan_id) or public.is_clan_member(post.clan_id, auth.uid()))
  order by created_at desc;
$$;

revoke all on function public.invite_to_clan(uuid, text) from public;
revoke all on function public.get_clan_invite_context(uuid) from public;
revoke all on function public.respond_to_clan_invite(uuid, boolean) from public;
revoke all on function public.set_clan_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_clan_member(uuid, uuid) from public;
revoke all on function public.get_profile_public_clan_count(uuid) from public;
revoke all on function public.get_feed_post_for_share(uuid) from public;
revoke all on function public.get_feed_profile_activity(uuid) from public;
revoke all on function public.notify_feed_reply() from public;
revoke all on function public.notify_feed_comment() from public;
grant execute on function public.invite_to_clan(uuid, text) to authenticated;
grant execute on function public.get_clan_invite_context(uuid) to authenticated;
grant execute on function public.respond_to_clan_invite(uuid, boolean) to authenticated;
grant execute on function public.set_clan_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_clan_member(uuid, uuid) to authenticated;
grant execute on function public.get_profile_public_clan_count(uuid) to anon, authenticated;
grant execute on function public.get_feed_post_for_share(uuid) to anon, authenticated;
grant execute on function public.get_feed_profile_activity(uuid) to anon, authenticated;
