-- One in-app activity stream shared by Sabha areas.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in (
    'clan_invite', 'clan_join_request', 'clan_join_accepted',
    'post_like', 'post_comment', 'new_blog_post', 'new_feed_post',
    'feed_reply', 'feed_comment', 'follow'
  )),
  title text not null check (char_length(title) <= 120),
  message text check (message is null or char_length(message) <= 240),
  entity_id uuid,
  entity_type text not null check (entity_type in ('blog_post', 'feed_post', 'profile', 'clan', 'clan_invite')),
  target_path text not null check (target_path ~ '^/' and target_path not like '//%'),
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_recent_idx
  on public.notifications (recipient_id, created_at desc, id desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Members can read their own notifications" on public.notifications;
create policy "Members can read their own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "Members can mark their own notifications read" on public.notifications;
create policy "Members can mark their own notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.emit_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_id uuid,
  p_entity_type text,
  p_target_path text,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_id is null or p_recipient_id = p_actor_id then
    return;
  end if;
  insert into public.notifications (
    recipient_id, actor_id, type, title, message,
    entity_id, entity_type, target_path, dedupe_key
  ) values (
    p_recipient_id, p_actor_id, p_type, p_title, p_message,
    p_entity_id, p_entity_type, p_target_path, p_dedupe_key
  ) on conflict (dedupe_key) do nothing;
end;
$$;

revoke all on function public.emit_notification(uuid, uuid, text, text, text, uuid, text, text, text) from public;

create or replace function public.notify_blog_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  perform public.emit_notification(post_author, new.user_id, 'post_comment', 'New comment on your blog', null, new.post_id, 'blog_post', '/blogs/' || new.post_id::text, 'blog-comment:' || new.id::text);
  return new;
end;
$$;

create or replace function public.notify_blog_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  perform public.emit_notification(post_author, new.user_id, 'post_like', 'Someone liked your blog', null, new.post_id, 'blog_post', '/blogs/' || new.post_id::text, 'blog-like:' || new.id::text);
  return new;
end;
$$;

create or replace function public.notify_new_blog_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower uuid;
begin
  for follower in select follower_id from public.profile_follows where following_id = new.author_id loop
    perform public.emit_notification(follower, new.author_id, 'new_blog_post', 'A member you follow published a blog', null, new.id, 'blog_post', '/blogs/' || new.id::text, 'new-blog:' || new.id::text || ':' || follower::text);
  end loop;
  return new;
end;
$$;

create or replace function public.notify_feed_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; post_clan uuid;
begin
  select author_id, clan_id into post_author, post_clan from public.feed_posts where id = new.post_id;
  if post_clan is null then
    perform public.emit_notification(post_author, new.author_id, 'feed_reply', 'New reply to your Feed post', null, new.post_id, 'feed_post', '/feed/' || new.post_id::text, 'feed-reply:' || new.id::text);
  end if;
  return new;
end;
$$;

create or replace function public.notify_feed_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; post_clan uuid;
begin
  select author_id, clan_id into post_author, post_clan from public.feed_posts where id = new.post_id;
  if post_clan is null then
    perform public.emit_notification(post_author, new.author_id, 'feed_comment', 'New comment on your Feed post', null, new.post_id, 'feed_post', '/feed/' || new.post_id::text, 'feed-comment:' || new.id::text);
  end if;
  return new;
end;
$$;

create or replace function public.notify_new_feed_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower uuid;
begin
  if new.clan_id is not null then return new; end if;
  for follower in select follower_id from public.profile_follows where following_id = new.author_id loop
    perform public.emit_notification(follower, new.author_id, 'new_feed_post', 'A member you follow posted in Feed', null, new.id, 'feed_post', '/feed/' || new.id::text, 'new-feed:' || new.id::text || ':' || follower::text);
  end loop;
  return new;
end;
$$;

create or replace function public.notify_profile_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower_username text;
begin
  select username into follower_username from public.profiles where id = new.follower_id;
  perform public.emit_notification(
    new.following_id,
    new.follower_id,
    'follow',
    'A member followed you',
    case when follower_username is null then null else '@' || follower_username || ' started following you.' end,
    new.follower_id,
    'profile',
    case when follower_username is null then '/' else '/profile/' || follower_username end,
    'follow:' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists comments_notification_after_insert on public.comments;
create trigger comments_notification_after_insert after insert on public.comments for each row execute function public.notify_blog_comment();
drop trigger if exists post_likes_notification_after_insert on public.post_likes;
create trigger post_likes_notification_after_insert after insert on public.post_likes for each row execute function public.notify_blog_like();
drop trigger if exists blog_posts_notification_after_insert on public.posts;
create trigger blog_posts_notification_after_insert after insert on public.posts for each row execute function public.notify_new_blog_post();
drop trigger if exists feed_replies_notification_after_insert on public.feed_replies;
create trigger feed_replies_notification_after_insert after insert on public.feed_replies for each row execute function public.notify_feed_reply();
drop trigger if exists feed_comments_notification_after_insert on public.feed_comments;
create trigger feed_comments_notification_after_insert after insert on public.feed_comments for each row execute function public.notify_feed_comment();
drop trigger if exists feed_posts_notification_after_insert on public.feed_posts;
create trigger feed_posts_notification_after_insert after insert on public.feed_posts for each row execute function public.notify_new_feed_post();
drop trigger if exists profile_follows_notification_after_insert on public.profile_follows;
create trigger profile_follows_notification_after_insert after insert on public.profile_follows for each row execute function public.notify_profile_follow();

revoke all on function public.notify_blog_comment() from public;
revoke all on function public.notify_blog_like() from public;
revoke all on function public.notify_new_blog_post() from public;
revoke all on function public.notify_feed_reply() from public;
revoke all on function public.notify_feed_comment() from public;
revoke all on function public.notify_new_feed_post() from public;
revoke all on function public.notify_profile_follow() from public;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
