-- Complete setup for databases missing Clan owner controls.
-- Run the entire file in Supabase SQL Editor. Existing Clan data is preserved.
begin;

-- Source: 20261014_clan_owner_controls.sql
-- Run after the existing Clan migrations. All operations use the signed-in user.
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

-- Source: 20261015_clan_activity_notifications.sql
-- Apply after 20261014_clan_owner_controls.sql and all existing Clan migrations.
alter table public.clans add column if not exists archived_at timestamptz;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
 'clan_invite','clan_join_request','clan_join_accepted','clan_join_declined','clan_invite_declined','clan_invite_revoked',
 'clan_member_joined','clan_member_left','clan_member_removed','clan_role_changed','clan_ownership_changed','clan_archived','clan_restored','clan_deleted','clan_updated','clan_post_deleted','clan_content_removed',
 'post_like','post_comment','new_blog_post','new_feed_post','new_clan_post','feed_like','feed_reply','feed_comment','follow'
));
alter table public.notifications add column if not exists clan_id uuid,
 add column if not exists context_label text check (context_label is null or char_length(context_label) <= 120),
 add column if not exists preview text check (preview is null or char_length(preview) <= 240);
create index if not exists notifications_clan_idx on public.notifications(clan_id) where clan_id is not null;

-- Private Clans stay absent from discovery; a known shared link exposes only a
-- minimal request screen, never its roster or posts.
create table if not exists public.clan_join_requests (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(), responded_at timestamptz,
 unique(clan_id,user_id)
);
create index if not exists clan_requests_pending_idx on public.clan_join_requests(clan_id,created_at) where status='pending';
alter table public.clan_join_requests enable row level security;
grant select on public.clan_join_requests to authenticated;
drop policy if exists "Read own or managed Clan requests" on public.clan_join_requests;
create policy "Read own or managed Clan requests" on public.clan_join_requests for select to authenticated using(user_id=auth.uid() or public.can_manage_clan(clan_id));

create or replace function public.get_requestable_clan(p_slug text)
returns table(id uuid,slug text,name text,avatar_url text,archived boolean,request_status text)
language sql stable security definer set search_path=public as $$
 select c.id,c.slug,c.name,c.avatar_url,c.archived_at is not null,
 (select r.status from public.clan_join_requests r where r.clan_id=c.id and r.user_id=auth.uid())
 from public.clans c where c.slug=p_slug and c.visibility='private' and auth.uid() is not null;
$$;

create or replace function public.request_to_join_clan(p_clan_id uuid,p_cancel boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare c public.clans%rowtype;
begin
 select * into c from public.clans where id=p_clan_id for update;
 if auth.uid() is null or not found then raise exception 'Sign in to request access.' using errcode='42501'; end if;
 if p_cancel then
  update public.clan_join_requests set status='cancelled',responded_at=now() where clan_id=p_clan_id and user_id=auth.uid() and status='pending';
  return;
 end if;
 if c.visibility <> 'private' or c.archived_at is not null then raise exception 'This Clan is not accepting requests.' using errcode='22023'; end if;
 if public.is_clan_member(p_clan_id) then raise exception 'You are already a member.' using errcode='22023'; end if;
 if exists(select 1 from public.clan_join_requests where clan_id=p_clan_id and user_id=auth.uid() and status='pending') then return; end if;
 if exists(select 1 from public.clan_join_requests where clan_id=p_clan_id and user_id=auth.uid() and created_at > now()-interval '1 day') then raise exception 'Wait 24 hours before sending another request.' using errcode='22023'; end if;
 insert into public.clan_join_requests(clan_id,user_id) values(p_clan_id,auth.uid()) on conflict(clan_id,user_id) do update set status='pending',created_at=now(),responded_at=null;
end;
$$;

create or replace function public.get_clan_join_requests(p_clan_id uuid)
returns table(id uuid,user_id uuid,name text,username text,avatar_url text,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.can_manage_clan(p_clan_id) then raise exception 'Only owners and admins can review requests.' using errcode='42501'; end if;
 return query select r.id,r.user_id,p.name,p.username,p.avatar_url,r.created_at from public.clan_join_requests r left join public.profiles p on p.id=r.user_id where r.clan_id=p_clan_id and r.status='pending' order by r.created_at;
end;
$$;

create or replace function public.respond_to_clan_join_request(p_clan_id uuid,p_request_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=public as $$
declare r public.clan_join_requests%rowtype; c public.clans%rowtype;
begin
 select * into c from public.clans where id=p_clan_id for update;
 if not public.can_manage_clan(p_clan_id) then raise exception 'Only owners and admins can review requests.' using errcode='42501'; end if;
 select * into r from public.clan_join_requests where id=p_request_id and clan_id=p_clan_id and status='pending' for update;
 if not found then raise exception 'This request has already been answered.' using errcode='P0002'; end if;
 if p_accept and c.archived_at is not null then raise exception 'Restore this Clan before approving requests.' using errcode='22023'; end if;
 if p_accept then insert into public.clan_members(clan_id,user_id,role) values(p_clan_id,r.user_id,'member') on conflict do nothing; end if;
 update public.clan_join_requests set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=r.id;
end;
$$;

-- Internal helper: one event per recipient, with a content snippet and context.
create or replace function public.emit_clan_notification(p_recipient uuid,p_actor uuid,p_type text,p_title text,p_message text,p_clan uuid,p_context text,p_preview text,p_entity uuid,p_entity_type text,p_path text,p_key text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_recipient is null or p_recipient=p_actor then return; end if;
 insert into public.notifications(recipient_id,actor_id,type,title,message,clan_id,context_label,preview,entity_id,entity_type,target_path,dedupe_key)
 values(p_recipient,p_actor,p_type,left(p_title,120),left(p_message,240),p_clan,left(p_context,120),left(p_preview,240),p_entity,p_entity_type,p_path,p_key)
 on conflict(dedupe_key) do nothing;
end;
$$;

create or replace function public.notify_clan_request()
returns trigger language plpgsql security definer set search_path=public as $$
declare c public.clans%rowtype; manager uuid;
begin
 select * into c from public.clans where id=new.clan_id;
 if new.status='pending' and (tg_op='INSERT' or old.status is distinct from new.status) then
  for manager in select user_id from public.clan_members where clan_id=c.id and role in('owner','admin') loop
   perform public.emit_clan_notification(manager,new.user_id,'clan_join_request','requested to join','Review this membership request.',c.id,c.name,null,new.id,'clan','/feed/clans/'||c.slug||'/settings?section=requests','clan-request:'||new.id||':'||new.created_at::text||':'||manager);
  end loop;
 elsif tg_op='UPDATE' and old.status='pending' and new.status in('accepted','declined') then
  perform public.emit_clan_notification(new.user_id,auth.uid(),case when new.status='accepted' then 'clan_join_accepted' else 'clan_join_declined' end,case when new.status='accepted' then 'approved your join request' else 'declined your join request' end,null,c.id,c.name,null,new.id,'clan','/feed/clans/'||c.slug,'clan-request-response:'||new.id||':'||new.responded_at::text);
 end if;
 if tg_op='UPDATE' and old.status='pending' and new.status<>'pending' then
  update public.notifications set read_at=coalesce(read_at,now()),message='This request has been '||new.status||'.' where type='clan_join_request' and entity_id=new.id;
 end if;
 return new;
end;
$$;
drop trigger if exists clan_requests_notify on public.clan_join_requests;
create trigger clan_requests_notify after insert or update on public.clan_join_requests for each row execute function public.notify_clan_request();

-- Feed likes share the existing post visibility and archive rules.
create table if not exists public.feed_likes (
 post_id uuid not null references public.feed_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
alter table public.feed_likes enable row level security;
grant select,insert,delete on public.feed_likes to authenticated;
drop policy if exists "Read likes on visible Feed posts" on public.feed_likes;
create policy "Read likes on visible Feed posts" on public.feed_likes for select to authenticated using(public.can_read_feed_post(post_id));
drop policy if exists "Like visible Feed posts" on public.feed_likes;
create policy "Like visible Feed posts" on public.feed_likes for insert to authenticated with check(user_id=auth.uid() and public.can_read_feed_post(post_id));
drop policy if exists "Unlike own Feed posts" on public.feed_likes;
create policy "Unlike own Feed posts" on public.feed_likes for delete to authenticated using(user_id=auth.uid());
-- Include likes when resolving a post's Clan for the archive guard.
create or replace function public.enforce_clan_archive()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_clan uuid; previous_clan uuid; archived timestamptz;
begin
 if tg_table_name in('feed_replies','feed_comments','feed_likes') then select clan_id into target_clan from public.feed_posts where id=new.post_id;
 else target_clan:=new.clan_id; end if;
 if tg_op='UPDATE' then
  if tg_table_name in('feed_replies','feed_comments','feed_likes') then select clan_id into previous_clan from public.feed_posts where id=old.post_id;
  else previous_clan:=old.clan_id; end if;
 end if;
 for archived in select archived_at from public.clans where id in(target_clan,previous_clan) order by id for share loop
  if archived is not null then raise exception 'This Clan is archived and read-only.' using errcode='55000'; end if;
 end loop;
 return new;
end;
$$;
drop trigger if exists enforce_clan_archive on public.feed_likes;
create trigger enforce_clan_archive before insert on public.feed_likes for each row execute function public.enforce_clan_archive();
create or replace function public.get_feed_like_summaries(p_post_ids uuid[])
returns table(post_id uuid,like_count bigint,liked boolean)
language sql stable security definer set search_path=public as $$
 select p.id,count(l.user_id),coalesce(bool_or(l.user_id=auth.uid()),false)
 from public.feed_posts p left join public.feed_likes l on l.post_id=p.id
 where p.id=any(p_post_ids[1:100]) and public.can_read_feed_post(p.id)
 group by p.id;
$$;

create or replace function public.notify_new_feed_post()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid; clan_name text; clan_slug text;
begin
 if new.clan_id is not null then
  select name,slug into clan_name,clan_slug from public.clans where id=new.clan_id;
  insert into public.notifications(recipient_id,actor_id,type,title,message,clan_id,context_label,preview,entity_id,entity_type,target_path,dedupe_key)
  select m.user_id,new.author_id,'new_clan_post','posted in your Clan',null,new.clan_id,clan_name,left(coalesce(new.title,new.body),240),new.id,'feed_post','/feed/clans/'||clan_slug||'?post='||new.id||'#post-'||new.id,'clan-post:'||new.id||':'||m.user_id
  from public.clan_members m where m.clan_id=new.clan_id and m.user_id<>new.author_id on conflict(dedupe_key) do nothing;
 else
  for recipient in select follower_id from public.profile_follows where following_id=new.author_id loop
   perform public.emit_clan_notification(recipient,new.author_id,'new_feed_post','posted in Feed',null,null,'Feed',coalesce(new.title,new.body),new.id,'feed_post','/feed?view='||new.post_type||'&post='||new.id||'#post-'||new.id,'new-feed:'||new.id||':'||recipient);
  end loop;
 end if;
 return new;
end;
$$;

create or replace function public.notify_feed_interaction()
returns trigger language plpgsql security definer set search_path=public as $$
declare p public.feed_posts%rowtype; c public.clans%rowtype; kind text; action text; snippet text; recipient uuid; destination text;
begin
 select * into p from public.feed_posts where id=new.post_id;
 select * into c from public.clans where id=p.clan_id;
 kind:=case tg_table_name when 'feed_likes' then 'feed_like' when 'feed_replies' then 'feed_reply' else 'feed_comment' end;
 action:=case kind when 'feed_like' then 'liked your post' when 'feed_reply' then 'replied to your post' else 'commented on your post' end;
 if kind='feed_like' then snippet:=coalesce(p.title,p.body); else snippet:=new.body; end if;
 destination:=case when p.clan_id is null then '/feed?view='||p.post_type||'&post='||p.id||'#post-'||p.id else '/feed/clans/'||c.slug||'?post='||p.id||'#post-'||p.id end;
 -- The author and thread participants receive replies/comments, not every member.
 for recipient in select distinct user_id from (
  select p.author_id as user_id
  union all select author_id from public.feed_replies where post_id=p.id and kind<>'feed_like'
  union all select author_id from public.feed_comments where post_id=p.id and kind<>'feed_like'
 ) participants where user_id<>new.author_id and (p.clan_id is null or c.visibility='public' or public.is_clan_member(p.clan_id,user_id)) loop
  perform public.emit_clan_notification(recipient,new.author_id,kind,case when recipient=p.author_id then action else case kind when 'feed_reply' then 'replied in a conversation' else 'commented in a conversation' end end,null,p.clan_id,coalesce(c.name,'Feed'),snippet,p.id,'feed_post',destination,kind||':'||p.id||':'||new.author_id||':'||new.created_at::text||':'||recipient);
 end loop;
 return new;
end;
$$;
-- Likes use user_id rather than author_id; normalize through a separate trigger.
create or replace function public.notify_feed_like()
returns trigger language plpgsql security definer set search_path=public as $$
declare p public.feed_posts%rowtype; c public.clans%rowtype;
begin
 select * into p from public.feed_posts where id=new.post_id;
 select * into c from public.clans where id=p.clan_id;
 if p.clan_id is null or c.visibility='public' or public.is_clan_member(p.clan_id,p.author_id) then
  perform public.emit_clan_notification(p.author_id,new.user_id,'feed_like','liked your post',null,p.clan_id,coalesce(c.name,'Feed'),coalesce(p.title,p.body),p.id,'feed_post',case when p.clan_id is null then '/feed?view='||p.post_type||'&post='||p.id||'#post-'||p.id else '/feed/clans/'||c.slug||'?post='||p.id||'#post-'||p.id end,'feed-like:'||p.id||':'||new.user_id);
 end if;
 return new;
end;
$$;
drop trigger if exists feed_replies_notification_after_insert on public.feed_replies;
create trigger feed_replies_notification_after_insert after insert on public.feed_replies for each row execute function public.notify_feed_interaction();
drop trigger if exists feed_comments_notification_after_insert on public.feed_comments;
create trigger feed_comments_notification_after_insert after insert on public.feed_comments for each row execute function public.notify_feed_interaction();
drop trigger if exists feed_likes_notification_after_insert on public.feed_likes;
create trigger feed_likes_notification_after_insert after insert on public.feed_likes for each row execute function public.notify_feed_like();

create or replace function public.notify_clan_membership()
returns trigger language plpgsql security definer set search_path=public as $$
declare c public.clans%rowtype; manager uuid; actor uuid:=auth.uid(); removed_name text;
begin
 if tg_op='DELETE' then select * into c from public.clans where id=old.clan_id; else select * into c from public.clans where id=new.clan_id; end if;
 if c.id is null then return null; end if; -- Parent deletion has its own summary.
 if tg_op='INSERT' then
  if new.role='owner' then return new; end if;
  for manager in select user_id from public.clan_members where clan_id=c.id and role in('owner','admin') and user_id not in(select inviter_id from public.clan_invites where clan_id=c.id and invitee_id=new.user_id and status='pending' and auth.uid()=new.user_id) loop
   perform public.emit_clan_notification(manager,new.user_id,'clan_member_joined','joined your Clan',null,c.id,c.name,null,new.user_id,'clan','/feed/clans/'||c.slug||'/settings?section=members','clan-joined:'||c.id||':'||new.user_id||':'||new.joined_at::text||':'||manager);
  end loop;
  -- Joining through another valid path also resolves outstanding requests/invites.
  update public.clan_invites set status='accepted',responded_at=now() where clan_id=c.id and invitee_id=new.user_id and status='pending';
  update public.clan_join_requests set status='accepted',responded_at=now() where clan_id=c.id and user_id=new.user_id and status='pending';
 elsif tg_op='UPDATE' and old.role is distinct from new.role and old.role<>'owner' and new.role<>'owner' then
  perform public.emit_clan_notification(new.user_id,actor,'clan_role_changed','updated your Clan role','Your role is now '||new.role||'.',c.id,c.name,null,c.id,'clan','/feed/clans/'||c.slug,'clan-role:'||c.id||':'||new.user_id||':'||clock_timestamp()::text);
 elsif tg_op='DELETE' then
  -- Do not leave private post snippets visible to a former member.
  delete from public.notifications where recipient_id=old.user_id and clan_id=c.id;
  if actor is distinct from old.user_id then
   perform public.emit_clan_notification(old.user_id,actor,'clan_member_removed','removed you from a Clan','You no longer have access to this Clan.',c.id,c.name,null,c.id,'clan','/feed?view=clans','clan-removed:'||c.id||':'||old.user_id||':'||clock_timestamp()::text);
  end if;
  select coalesce('@'||username,name,'A member') into removed_name from public.profiles where id=old.user_id;
  for manager in select user_id from public.clan_members where clan_id=c.id and role in('owner','admin') loop
   perform public.emit_clan_notification(manager,coalesce(actor,old.user_id),case when actor=old.user_id then 'clan_member_left' else 'clan_member_removed' end,case when actor=old.user_id then 'left your Clan' else 'removed a Clan member' end,case when actor=old.user_id then null else coalesce(removed_name,'A member')||' was removed from this Clan.' end,c.id,c.name,null,c.id,'clan','/feed/clans/'||c.slug||'/settings?section=members','clan-member-ended:'||c.id||':'||old.user_id||':'||clock_timestamp()::text||':'||manager);
  end loop;
 end if;
 return null;
end;
$$;
drop trigger if exists clan_members_notification on public.clan_members;
create trigger clan_members_notification after insert or update or delete on public.clan_members for each row execute function public.notify_clan_membership();

create or replace function public.notify_clan_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_id uuid; kind text; action text; details text;
begin
 if tg_op='DELETE' then
  delete from public.notifications where clan_id=old.id;
  for member_id in select user_id from public.clan_members where clan_id=old.id union select invitee_id from public.clan_invites where clan_id=old.id and status='pending' union select user_id from public.clan_join_requests where clan_id=old.id and status='pending' loop
   perform public.emit_clan_notification(member_id,auth.uid(),'clan_deleted','deleted a Clan','Its posts, members, and invitations have been removed.',old.id,old.name,null,old.id,'clan','/feed?view=clans','clan-deleted:'||old.id||':'||member_id);
  end loop;
  return old;
 end if;
 if old.created_by is distinct from new.created_by then kind:='clan_ownership_changed'; action:='transferred Clan ownership';
 elsif old.archived_at is distinct from new.archived_at then kind:=case when new.archived_at is null then 'clan_restored' else 'clan_archived' end; action:=case when new.archived_at is null then 'restored your Clan' else 'archived your Clan' end;
 elsif old.name is distinct from new.name or old.visibility is distinct from new.visibility or old.description is distinct from new.description or old.avatar_url is distinct from new.avatar_url then kind:='clan_updated'; action:='updated your Clan';
 else return new; end if;
 if kind='clan_ownership_changed' then
  select coalesce(name,'@'||username,'A Clan member')||' is now the owner.' into details from public.profiles where id=new.created_by;
 elsif kind='clan_archived' then details:='Existing posts remain available. New activity is paused.';
 elsif kind='clan_restored' then details:='Posting and joining are available again.';
 elsif old.name is distinct from new.name then details:='Renamed from '||old.name||' to '||new.name||'.';
 elsif old.visibility is distinct from new.visibility then details:='This Clan is now '||new.visibility||'.';
 elsif old.description is distinct from new.description then details:='Updated the Clan description.';
 else details:='Updated the Clan image.'; end if;
 for member_id in select user_id from public.clan_members where clan_id=new.id loop
  perform public.emit_clan_notification(member_id,auth.uid(),kind,action,details,new.id,new.name,null,new.id,'clan','/feed/clans/'||new.slug,'clan-change:'||new.id||':'||clock_timestamp()::text||':'||member_id);
 end loop;
 return new;
end;
$$;
drop trigger if exists clan_change_notification on public.clans;
create trigger clan_change_notification before update or delete on public.clans for each row execute function public.notify_clan_change();

-- Invitations are still sent by the existing RPC; enrich them without sending a
-- second invitation. Acceptance and decline notify the inviter through this hook.
create or replace function public.notify_clan_invitation()
returns trigger language plpgsql security definer set search_path=public as $$
declare c public.clans%rowtype;
begin
 if tg_op='DELETE' then
  select * into c from public.clans where id=old.clan_id;
  if c.id is not null and old.status='pending' then
   delete from public.notifications where dedupe_key='clan-invite:'||old.id;
   perform public.emit_clan_notification(old.invitee_id,auth.uid(),'clan_invite_revoked','withdrew a Clan invitation',null,c.id,c.name,null,c.id,'clan','/feed?view=clans','clan-invite-revoked:'||old.id);
  end if;
  return old;
 end if;
 select * into c from public.clans where id=new.clan_id;
 if tg_op='UPDATE' and old.status='pending' and new.status in('accepted','declined') then
  perform public.emit_clan_notification(new.inviter_id,new.invitee_id,case when new.status='accepted' then 'clan_join_accepted' else 'clan_invite_declined' end,case when new.status='accepted' then 'accepted your Clan invitation' else 'declined your Clan invitation' end,null,c.id,c.name,null,c.id,'clan','/feed/clans/'||c.slug,'clan-invite-response:'||new.id||':'||new.responded_at::text);
  update public.notifications set read_at=coalesce(read_at,now()),message='Invitation '||new.status||'.',target_path=case when new.status='accepted' then '/feed/clans/'||c.slug else '/feed?view=clans' end where dedupe_key='clan-invite:'||new.id;
 end if;
 return new;
end;
$$;
drop trigger if exists clan_invitation_notification on public.clan_invites;
create trigger clan_invitation_notification after update or delete on public.clan_invites for each row execute function public.notify_clan_invitation();
-- Avoid the older RPC's extra acceptance event; the hook is now authoritative.
create or replace function public.respond_to_clan_invite(p_invite_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=public as $$
declare i public.clan_invites%rowtype; clan_slug text;
begin
 select * into i from public.clan_invites where id=p_invite_id and invitee_id=auth.uid() and status='pending' for update;
 if not found then raise exception 'This invitation is no longer available.' using errcode='P0002'; end if;
 select slug into clan_slug from public.clans where id=i.clan_id;
 if p_accept then insert into public.clan_members(clan_id,user_id,role) values(i.clan_id,auth.uid(),'member') on conflict do nothing; end if;
 update public.clan_invites set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=i.id;
 return clan_slug;
end;
$$;
create or replace function public.enrich_clan_invite_notification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.type='clan_invite' then
  new.clan_id:=new.entity_id;
  select name into new.context_label from public.clans where id=new.entity_id;
  new.title:='invited you to a Clan';
  -- Reinviting after decline must restore the response link on the existing row.
  if exists(select 1 from public.clan_invites where clan_id=new.entity_id and invitee_id=new.recipient_id and status='pending') then
   select '/feed/clan-invites/'||id into new.target_path from public.clan_invites where clan_id=new.entity_id and invitee_id=new.recipient_id and status='pending';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists enrich_clan_invite_notification on public.notifications;
create trigger enrich_clan_invite_notification before insert or update on public.notifications for each row execute function public.enrich_clan_invite_notification();

create or replace function public.notify_clan_post_deleted()
returns trigger language plpgsql security definer set search_path=public as $$
declare c public.clans%rowtype;
begin
 select * into c from public.clans where id=old.clan_id;
 delete from public.notifications where entity_type='feed_post' and entity_id=old.id;
 if c.id is null then return old; end if;
 if auth.uid() is distinct from old.author_id then
  perform public.emit_clan_notification(old.author_id,auth.uid(),'clan_post_deleted','removed your Clan post','A Clan moderator removed your post.',c.id,c.name,null,c.id,'clan',case when c.visibility='public' or public.is_clan_member(c.id,old.author_id) then '/feed/clans/'||c.slug else '/feed?view=clans' end,'clan-post-removed:'||old.id);
 end if;
 return old;
end;
$$;
drop trigger if exists clan_post_deleted_notification on public.feed_posts;
create trigger clan_post_deleted_notification before delete on public.feed_posts for each row execute function public.notify_clan_post_deleted();

create or replace function public.notify_clan_content_removed()
returns trigger language plpgsql security definer set search_path=public as $$
declare p public.feed_posts%rowtype; c public.clans%rowtype; kind text; label text;
begin
 kind:=case when tg_table_name='feed_replies' then 'feed_reply' else 'feed_comment' end;
 label:=case when tg_table_name='feed_replies' then 'reply' else 'comment' end;
 delete from public.notifications where dedupe_key like kind||':'||old.post_id||':'||old.author_id||':'||old.created_at::text||':%' or dedupe_key=replace(kind,'_','-')||':'||old.id;
 select * into p from public.feed_posts where id=old.post_id;
 select * into c from public.clans where id=p.clan_id;
 -- Skip parent cascades and self-deletion; notify only the affected author.
 if c.id is not null and auth.uid() is distinct from old.author_id then
  perform public.emit_clan_notification(old.author_id,auth.uid(),'clan_content_removed','removed your '||label,'A Clan moderator removed your '||label||'.',c.id,c.name,null,c.id,'clan',case when c.visibility='public' or public.is_clan_member(c.id,old.author_id) then '/feed/clans/'||c.slug||'?post='||p.id||'#post-'||p.id else '/feed?view=clans' end,'clan-content-removed:'||old.id);
 end if;
 return old;
end;
$$;
drop trigger if exists clan_reply_removed_notification on public.feed_replies;
create trigger clan_reply_removed_notification before delete on public.feed_replies for each row execute function public.notify_clan_content_removed();
drop trigger if exists clan_comment_removed_notification on public.feed_comments;
create trigger clan_comment_removed_notification before delete on public.feed_comments for each row execute function public.notify_clan_content_removed();

create or replace function public.notify_blog_comment()
returns trigger language plpgsql security definer set search_path=public as $$
declare author uuid; post_title text;
begin
 select author_id,title into author,post_title from public.posts where id=new.post_id;
 perform public.emit_clan_notification(author,new.user_id,'post_comment','commented on your blog',null,null,post_title,new.content,new.post_id,'blog_post','/blogs/'||new.post_id,'blog-comment:'||new.id);
 return new;
end;
$$;
create or replace function public.notify_blog_like()
returns trigger language plpgsql security definer set search_path=public as $$
declare author uuid; post_title text;
begin
 select author_id,title into author,post_title from public.posts where id=new.post_id;
 perform public.emit_clan_notification(author,new.user_id,'post_like','liked your blog',null,null,'Blogs',post_title,new.post_id,'blog_post','/blogs/'||new.post_id,'blog-like:'||new.post_id||':'||new.user_id);
 return new;
end;
$$;
create or replace function public.notify_new_blog_post()
returns trigger language plpgsql security definer set search_path=public as $$
declare follower uuid;
begin
 for follower in select follower_id from public.profile_follows where following_id=new.author_id loop
  perform public.emit_clan_notification(follower,new.author_id,'new_blog_post','published a blog',null,null,'Blogs',new.title,new.id,'blog_post','/blogs/'||new.id,'new-blog:'||new.id||':'||follower);
 end loop;
 return new;
end;
$$;

create or replace function public.clear_unlike_notification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 delete from public.notifications where dedupe_key=(case when tg_table_name='feed_likes' then 'feed-like:' else 'blog-like:' end)||old.post_id||':'||old.user_id;
 if tg_table_name='post_likes' then delete from public.notifications where dedupe_key='blog-like:'||old.id; end if;
 return old;
end;
$$;
drop trigger if exists feed_unlike_notification on public.feed_likes;
create trigger feed_unlike_notification after delete on public.feed_likes for each row execute function public.clear_unlike_notification();
drop trigger if exists blog_unlike_notification on public.post_likes;
create trigger blog_unlike_notification after delete on public.post_likes for each row execute function public.clear_unlike_notification();

revoke all on function public.get_requestable_clan(text),public.request_to_join_clan(uuid,boolean),public.get_clan_join_requests(uuid),public.respond_to_clan_join_request(uuid,uuid,boolean),public.get_feed_like_summaries(uuid[]) from public;
grant execute on function public.get_requestable_clan(text),public.request_to_join_clan(uuid,boolean),public.get_clan_join_requests(uuid),public.respond_to_clan_join_request(uuid,uuid,boolean),public.get_feed_like_summaries(uuid[]) to authenticated;
revoke all on function public.emit_clan_notification(uuid,uuid,text,text,text,uuid,text,text,uuid,text,text,text),public.notify_clan_request(),public.notify_feed_interaction(),public.notify_feed_like(),public.notify_clan_membership(),public.notify_clan_change(),public.notify_clan_invitation(),public.enrich_clan_invite_notification(),public.notify_clan_post_deleted(),public.notify_clan_content_removed(),public.clear_unlike_notification() from public;

commit;
