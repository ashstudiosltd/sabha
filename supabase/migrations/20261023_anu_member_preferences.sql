-- Private account-owned profile settings used by both Anu and DEVVRATS.
begin;
create table if not exists public.anu_member_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  remember text not null default '' check (char_length(remember) <= 1500),
  response_style text not null default '' check (char_length(response_style) <= 1000),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  updated_at timestamptz not null default now()
);
alter table public.anu_member_preferences enable row level security;
revoke all on public.anu_member_preferences from anon, authenticated;
grant select, insert, update on public.anu_member_preferences to authenticated;
drop policy if exists "Read own Anu profile" on public.anu_member_preferences;
create policy "Read own Anu profile" on public.anu_member_preferences for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Create own Anu profile" on public.anu_member_preferences;
create policy "Create own Anu profile" on public.anu_member_preferences for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Update own Anu profile" on public.anu_member_preferences;
create policy "Update own Anu profile" on public.anu_member_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
commit;
