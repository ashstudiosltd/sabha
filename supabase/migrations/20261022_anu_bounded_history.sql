begin;
-- Called only for the authenticated owner's new turn. Never prunes another account.
create or replace function public.bound_anu_conversation_turns()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Invalid history owner' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,22));
 delete from public.anu_conversation_turns where user_id=new.user_id and created_at <= now()-interval '45 days';
 delete from public.anu_conversation_turns where id in (select id from public.anu_conversation_turns where user_id=new.user_id and scope=new.scope order by created_at desc,id desc offset 19);
 if new.scope like 'portal:%' then
  delete from public.anu_conversation_turns where user_id=new.user_id and scope like 'portal:%' and scope<>new.scope and scope in (select scope from public.anu_conversation_turns where user_id=new.user_id and scope like 'portal:%' and scope<>new.scope group by scope order by max(created_at) desc,scope desc offset 19);
 end if;
 return new;
end;
$$;
revoke all on function public.bound_anu_conversation_turns() from public,anon,authenticated;
drop trigger if exists bound_anu_turns on public.anu_conversation_turns;
create trigger bound_anu_turns before insert on public.anu_conversation_turns for each row execute function public.bound_anu_conversation_turns();
commit;
