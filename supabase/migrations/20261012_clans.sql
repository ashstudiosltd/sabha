-- Sabha Clans v1: public build groups connected to existing Feed posts.
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 1000),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  clan_id uuid not null references public.clans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);

create index if not exists clans_created_at_idx on public.clans (created_at desc);
create index if not exists clan_members_user_id_idx on public.clan_members (user_id, joined_at desc);

alter table public.feed_posts
  add column if not exists clan_id uuid references public.clans (id) on delete cascade;
create index if not exists feed_posts_clan_created_idx
  on public.feed_posts (clan_id, created_at desc, id desc)
  where clan_id is not null;

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;

grant select on public.clans, public.clan_members to anon, authenticated;
grant insert, delete on public.clan_members to authenticated;

drop policy if exists "Anyone can read public Clans" on public.clans;
create policy "Anyone can read public Clans"
  on public.clans for select to anon, authenticated using (true);

drop policy if exists "Clan owners can update their Clans" on public.clans;
create policy "Clan owners can update their Clans"
  on public.clans for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "Clan owners can delete their Clans" on public.clans;
create policy "Clan owners can delete their Clans"
  on public.clans for delete to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists "Public Clan memberships are visible" on public.clan_members;
create policy "Public Clan memberships are visible"
  on public.clan_members for select to anon, authenticated using (true);

drop policy if exists "Members can join a Clan as themselves" on public.clan_members;
create policy "Members can join a Clan as themselves"
  on public.clan_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and exists (select 1 from public.clans where clans.id = clan_members.clan_id)
  );

drop policy if exists "Members can leave their Clan" on public.clan_members;
create policy "Members can leave their Clan"
  on public.clan_members for delete to authenticated
  using (user_id = (select auth.uid()) and role = 'member');

create or replace function public.add_clan_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clan_members (clan_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists clans_add_owner_membership on public.clans;
create trigger clans_add_owner_membership
  after insert on public.clans
  for each row execute function public.add_clan_owner_membership();

create or replace function public.create_clan(p_name text, p_slug text, p_description text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_clan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Clan.' using errcode = '28000';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 then
    raise exception 'Clan names must be between 2 and 60 characters.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_description, '')) > 1000 then
    raise exception 'Clan descriptions must be 1000 characters or fewer.' using errcode = '22023';
  end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Choose a valid Clan URL.' using errcode = '22023';
  end if;

  insert into public.clans (name, slug, description, created_by)
  values (btrim(p_name), p_slug, btrim(coalesce(p_description, '')), auth.uid())
  returning id into new_clan_id;

  return new_clan_id;
end;
$$;

revoke all on function public.add_clan_owner_membership() from public;
revoke all on function public.create_clan(text, text, text) from public;
grant execute on function public.create_clan(text, text, text) to authenticated;

drop policy if exists "Members can read Feed posts" on public.feed_posts;
create policy "Members can read Feed posts"
  on public.feed_posts for select to authenticated using (
    clan_id is null or exists (select 1 from public.clans where clans.id = feed_posts.clan_id)
  );

drop policy if exists "Members can publish their own Feed posts" on public.feed_posts;
create policy "Members can publish their own Feed posts"
  on public.feed_posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (clan_id is null or exists (
      select 1 from public.clan_members
      where clan_members.clan_id = feed_posts.clan_id
        and clan_members.user_id = (select auth.uid())
    ))
  );

drop policy if exists "Authors can edit their Feed posts" on public.feed_posts;
create policy "Authors can edit their Feed posts"
  on public.feed_posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and (clan_id is null or exists (
      select 1 from public.clan_members
      where clan_members.clan_id = feed_posts.clan_id
        and clan_members.user_id = (select auth.uid())
    ))
  );

drop policy if exists "Authors can delete their Feed posts" on public.feed_posts;
create policy "Authors can delete their Feed posts"
  on public.feed_posts for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Members can reply as themselves" on public.feed_replies;
create policy "Members can reply as themselves"
  on public.feed_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.feed_posts as post
      where post.id = feed_replies.post_id
        and (post.clan_id is null or exists (
          select 1 from public.clan_members as membership
          where membership.clan_id = post.clan_id
            and membership.user_id = (select auth.uid())
        ))
    )
  );

drop policy if exists "Members can comment as themselves" on public.feed_comments;
create policy "Members can comment as themselves"
  on public.feed_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.feed_posts as post
      where post.id = feed_comments.post_id
        and (post.clan_id is null or exists (
          select 1 from public.clan_members as membership
          where membership.clan_id = post.clan_id
            and membership.user_id = (select auth.uid())
        ))
    )
  );

create or replace function public.get_profile_public_clan_count(p_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.clan_members as membership
  where membership.user_id = p_profile_id;
$$;

revoke all on function public.get_profile_public_clan_count(uuid) from public;
grant execute on function public.get_profile_public_clan_count(uuid) to anon, authenticated;

create or replace function public.get_public_clan_summaries()
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  created_by uuid,
  created_at timestamptz,
  member_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select clan.id, clan.slug, clan.name, clan.description, clan.created_by, clan.created_at,
    (select count(*) from public.clan_members as membership where membership.clan_id = clan.id)
  from public.clans as clan
  order by clan.created_at desc;
$$;

revoke all on function public.get_public_clan_summaries() from public;
grant execute on function public.get_public_clan_summaries() to anon, authenticated;
