-- Account-owned conversation turns. No service credentials or public access.
begin;
create table if not exists public.anu_conversation_turns (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check (char_length(scope) between 1 and 120),
 question text not null check (char_length(question) between 1 and 2000),
 answer text not null check (char_length(answer) between 1 and 8000),
 sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) <= 6),
 context_sources jsonb not null default '[]' check (jsonb_typeof(context_sources) = 'array' and jsonb_array_length(context_sources) <= 6),
 created_at timestamptz not null default now()
);
create index if not exists anu_turns_account_scope_date on public.anu_conversation_turns(user_id,scope,created_at desc,id desc);
alter table public.anu_conversation_turns enable row level security;
revoke all on public.anu_conversation_turns from anon, authenticated;
grant select, insert, delete on public.anu_conversation_turns to authenticated;
drop policy if exists "Read own Anu turns" on public.anu_conversation_turns;
create policy "Read own Anu turns" on public.anu_conversation_turns for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Save own Anu turns" on public.anu_conversation_turns;
create policy "Save own Anu turns" on public.anu_conversation_turns for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "Forget own Anu turns" on public.anu_conversation_turns;
create policy "Forget own Anu turns" on public.anu_conversation_turns for delete to authenticated using(user_id=(select auth.uid()));
commit;
