-- Feed v1: independent from long-form Blogs posts, using the same Sabha users.
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  post_type text not null check (post_type in ('conversation', 'project')),
  title text,
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  resource_kind text,
  resource_url text,
  resource_label text,
  created_at timestamptz not null default now(),
  constraint feed_posts_title_length check (title is null or char_length(title) <= 140),
  constraint feed_posts_project_title check (post_type <> 'project' or nullif(btrim(title), '') is not null),
  constraint feed_posts_resource_fields check (
    num_nonnulls(resource_kind, resource_url, resource_label) = 0
    or
    (num_nonnulls(resource_kind, resource_url, resource_label) = 3
      and resource_kind in ('blog', 'project', 'github', 'readme', 'image', 'link')
      and resource_url is not null
      and char_length(resource_url) <= 2048
      and resource_label is not null
      and char_length(resource_label) between 1 and 120)
  ),
  constraint feed_posts_resource_url check (
    resource_url is null
    or resource_url ~* '^https://'
    or resource_url ~ '^/(blogs|sabha/projects|projects)/[[:alnum:]][[:alnum:]_./-]*$'
  )
);

create table if not exists public.feed_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists feed_posts_created_at_idx
  on public.feed_posts (created_at desc, id desc);
create index if not exists feed_posts_author_id_idx
  on public.feed_posts (author_id);
create index if not exists feed_replies_post_created_idx
  on public.feed_replies (post_id, created_at, id);
create index if not exists feed_replies_author_id_idx
  on public.feed_replies (author_id);

alter table public.feed_posts enable row level security;
alter table public.feed_replies enable row level security;

grant select, insert, update, delete on public.feed_posts to authenticated;
grant select, insert, update, delete on public.feed_replies to authenticated;

drop policy if exists "Members can read Feed posts" on public.feed_posts;
create policy "Members can read Feed posts"
  on public.feed_posts for select to authenticated
  using (true);

drop policy if exists "Members can publish their own Feed posts" on public.feed_posts;
create policy "Members can publish their own Feed posts"
  on public.feed_posts for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can edit their Feed posts" on public.feed_posts;
create policy "Authors can edit their Feed posts"
  on public.feed_posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete their Feed posts" on public.feed_posts;
create policy "Authors can delete their Feed posts"
  on public.feed_posts for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Members can read Feed replies" on public.feed_replies;
create policy "Members can read Feed replies"
  on public.feed_replies for select to authenticated
  using (exists (
    select 1 from public.feed_posts
    where feed_posts.id = feed_replies.post_id
  ));

drop policy if exists "Members can reply as themselves" on public.feed_replies;
create policy "Members can reply as themselves"
  on public.feed_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.feed_posts
      where feed_posts.id = feed_replies.post_id
    )
  );

drop policy if exists "Authors can edit their Feed replies" on public.feed_replies;
create policy "Authors can edit their Feed replies"
  on public.feed_replies for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete their Feed replies" on public.feed_replies;
create policy "Authors can delete their Feed replies"
  on public.feed_replies for delete to authenticated
  using (author_id = (select auth.uid()));
