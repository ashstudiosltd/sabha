there
-- Public metadata for shared Feed posts. The Feed tables stay member-only;
-- this RPC returns only the single post requested by its share URL.
create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists feed_comments_post_created_idx
  on public.feed_comments (post_id, created_at, id);
create index if not exists feed_comments_author_id_idx
  on public.feed_comments (author_id);

alter table public.feed_comments enable row level security;
grant select, insert, update, delete on public.feed_comments to authenticated;

drop policy if exists "Members can read Feed comments" on public.feed_comments;
create policy "Members can read Feed comments"
  on public.feed_comments for select to authenticated
  using (exists (
    select 1 from public.feed_posts
    where feed_posts.id = feed_comments.post_id
  ));

drop policy if exists "Members can comment as themselves" on public.feed_comments;
create policy "Members can comment as themselves"
  on public.feed_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.feed_posts
      where feed_posts.id = feed_comments.post_id
    )
  );

drop policy if exists "Authors can edit their Feed comments" on public.feed_comments;
create policy "Authors can edit their Feed comments"
  on public.feed_comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete their Feed comments" on public.feed_comments;
create policy "Authors can delete their Feed comments"
  on public.feed_comments for delete to authenticated
  using (author_id = (select auth.uid()));

create or replace function public.get_feed_post_for_share(p_post_id uuid)
returns table (
  id uuid,
  post_type text,
  title text,
  body text,
  resource_kind text,
  resource_url text,
  resource_label text,
  created_at timestamptz,
  author_name text,
  author_username text,
  author_avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    post.id,
    post.post_type,
    post.title,
    post.body,
    post.resource_kind,
    post.resource_url,
    post.resource_label,
    post.created_at,
    coalesce(profile.name, 'Community member'),
    coalesce(profile.username, 'member'),
    profile.avatar_url
  from public.feed_posts as post
  left join public.profiles as profile on profile.id = post.author_id
  where post.id = p_post_id
  limit 1;
$$;

revoke all on function public.get_feed_post_for_share(uuid) from public;
grant execute on function public.get_feed_post_for_share(uuid) to anon, authenticated;

-- Public profile activity is scoped to the requested profile only. It does
-- not make the Feed tables publicly selectable through PostgREST.
create or replace function public.get_feed_profile_activity(p_profile_id uuid)
returns table (
  id uuid,
  activity_type text,
  post_id uuid,
  post_type text,
  title text,
  body text,
  created_at timestamptz,
  resource_kind text,
  resource_url text,
  resource_label text,
  parent_title text,
  parent_body text,
  parent_author_name text,
  parent_author_username text
)
language sql
security definer
set search_path = public
as $$
  select
    post.id,
    'post'::text,
    post.id,
    post.post_type,
    post.title,
    post.body,
    post.created_at,
    post.resource_kind,
    post.resource_url,
    post.resource_label,
    null::text,
    null::text,
    null::text,
    null::text
  from public.feed_posts as post
  where post.author_id = p_profile_id

  union all

  select
    reply.id,
    'reply'::text,
    post.id,
    post.post_type,
    post.title,
    reply.body,
    reply.created_at,
    post.resource_kind,
    post.resource_url,
    post.resource_label,
    post.title,
    post.body,
    coalesce(parent_profile.name, 'Community member'),
    coalesce(parent_profile.username, 'member')
  from public.feed_replies as reply
  join public.feed_posts as post on post.id = reply.post_id
  left join public.profiles as parent_profile on parent_profile.id = post.author_id
  where reply.author_id = p_profile_id
  order by created_at desc;
$$;

revoke all on function public.get_feed_profile_activity(uuid) from public;
grant execute on function public.get_feed_profile_activity(uuid) to anon, authenticated;
