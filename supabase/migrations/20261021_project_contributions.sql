begin;
create table if not exists public.project_contribution_guides(
 project_id uuid primary key references public.projects(id) on delete cascade,
 overview text not null default '' check(char_length(overview)<=2000),
 setup text not null default '' check(char_length(setup)<=4000),
 first_steps text not null default '' check(char_length(first_steps)<=3000),
 version bigint not null default 1 check(version>0),
 updated_at timestamptz not null default now()
);
alter table public.project_contribution_guides enable row level security;
revoke all on public.project_contribution_guides from anon,authenticated;
grant select on public.project_contribution_guides to anon,authenticated;
grant insert,update on public.project_contribution_guides to authenticated;
drop policy if exists "Read guidance for accessible projects" on public.project_contribution_guides;
create policy "Read guidance for accessible projects" on public.project_contribution_guides for select using(exists(select 1 from public.projects p where p.id=project_id));
drop policy if exists "Create project guidance" on public.project_contribution_guides;
create policy "Create project guidance" on public.project_contribution_guides for insert to authenticated with check(public.can_manage_project(project_id) and exists(select 1 from public.projects p where p.id=project_id and p.archived_at is null));
drop policy if exists "Edit project guidance" on public.project_contribution_guides;
create policy "Edit project guidance" on public.project_contribution_guides for update to authenticated using(public.can_manage_project(project_id) and exists(select 1 from public.projects p where p.id=project_id and p.archived_at is null)) with check(public.can_manage_project(project_id) and exists(select 1 from public.projects p where p.id=project_id and p.archived_at is null));
commit;
