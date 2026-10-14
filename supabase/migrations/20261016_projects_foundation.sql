-- Projects foundation. Requires only the existing public.profiles(id) identity.
-- Existing profiles and notification types are unchanged. The verified legacy
-- Projects schema is upgraded additively, with original records backed up privately.
begin;

-- Refuse incompatible pre-existing tables instead of modifying unrelated data.
do $$
declare item record; required_column text;
begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and information_schema.columns.column_name='id' and data_type='uuid') then
  raise exception 'Projects requires the existing public.profiles table with a UUID id. Run this in the shared Devvrats/Sabha project.';
 end if;
 for item in select * from (values
  ('projects',array['id','slug','owner_id','created_by','name','tagline','description','technologies','visibility','stage','publication_status','published_at','archived_at','version','created_at','updated_at']),
  ('project_members',array['project_id','profile_id','role','added_by','joined_at']),
  ('project_audit_events',array['id','project_id','actor_id','event_type','subject_id','changed_fields','created_at']),
  ('project_slug_reservations',array['slug','project_id','reserved_at'])
 ) as expected(table_name,columns) loop
  if item.table_name='projects' and to_regclass('public.projects') is not null
   and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='name')
   and (select count(*) from information_schema.columns where table_schema='public' and table_name='projects' and ((column_name='id' and udt_name='uuid') or (column_name in('title','description','project_url') and udt_name='text')))=4 then
    continue; -- Recognized legacy schema supplied by the database owner.
  end if;
  if to_regclass('public.'||item.table_name) is not null then
   foreach required_column in array item.columns loop
    if not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=item.table_name and c.column_name=required_column) then
     raise exception 'An incompatible public.% table already exists. Inspect its schema before applying Projects; no existing data has been changed.',item.table_name;
    end if;
   end loop;
  end if;
 end loop;
end;
$$;

-- Upgrade the verified four-column legacy schema in place. Owners cannot be
-- inferred from a title or URL, so imports remain private and unowned until an
-- administrator assigns an existing profile explicitly.
do $$
begin
 if to_regclass('public.projects') is not null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='name') then
  create table if not exists public.project_legacy_imports (
   project_id uuid primary key references public.projects(id) on delete cascade,
   original_record jsonb not null,
   imported_at timestamptz not null default now()
  );
  alter table public.project_legacy_imports enable row level security;
  revoke all on public.project_legacy_imports from anon,authenticated;
  insert into public.project_legacy_imports(project_id,original_record)
   select id,jsonb_build_object('id',id,'title',title,'description',description,'project_url',project_url) from public.projects on conflict do nothing;
  alter table public.projects
   add column slug text,
   add column owner_id uuid references public.profiles(id) on delete restrict,
   add column created_by uuid references public.profiles(id) on delete set null,
   add column name text,
   add column tagline text not null default '',
   add column technologies text[] not null default '{}',
   add column visibility text not null default 'private',
   add column stage text not null default 'idea',
   add column publication_status text not null default 'draft',
   add column published_at timestamptz,
   add column archived_at timestamptz,
   add column version bigint not null default 1,
   add column created_at timestamptz not null default now(),
   add column updated_at timestamptz not null default now(),
   add column legacy_owner_pending boolean not null default false;
  update public.projects set slug='imported-'||replace(id::text,'-',''),name=left(btrim(title),80),description=coalesce(description,''),legacy_owner_pending=true;
  alter table public.projects
   alter column id set default gen_random_uuid(),
   alter column slug set not null,
   alter column name set not null,
   alter column description set default '',
   alter column description set not null,
   add constraint projects_slug_key unique(slug),
   add constraint projects_name_length check(char_length(btrim(name)) between 2 and 80),
   add constraint projects_tagline_length check(char_length(tagline)<=180),
   add constraint projects_technology_count check(cardinality(technologies)<=20),
   add constraint projects_visibility_valid check(visibility in('public','private')),
   add constraint projects_stage_valid check(stage in('idea','prototype','building','launched','maintaining','paused','completed')),
   add constraint projects_publication_status_valid check(publication_status in('draft','published')),
   add constraint projects_version_valid check(version>0),
   add constraint projects_slug_valid check(char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug not in('new','activity','settings','api','auth','explore','discover','search')),
   add constraint projects_publication_valid check(publication_status<>'published' or published_at is not null);
 end if;
end;
$$;

create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 owner_id uuid references public.profiles(id) on delete restrict,
 created_by uuid references public.profiles(id) on delete set null,
 name text not null check(char_length(btrim(name)) between 2 and 80),
 tagline text not null default '' check(char_length(tagline)<=180),
 description text not null default '' check(char_length(description)<=10000),
 technologies text[] not null default '{}' check(cardinality(technologies)<=20),
 visibility text not null default 'private' check(visibility in('public','private')),
 stage text not null default 'idea' check(stage in('idea','prototype','building','launched','maintaining','paused','completed')),
 publication_status text not null default 'draft' check(publication_status in('draft','published')),
 published_at timestamptz,
 archived_at timestamptz,
 version bigint not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint projects_slug_valid check(char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug not in('new','activity','settings','api','auth','explore','discover','search')),
 constraint projects_publication_valid check(publication_status<>'published' or published_at is not null)
);

-- The sole ownerless state is a protected, unpublished legacy import. RPC
-- creation never sets this flag and always derives ownership from auth.uid().
alter table public.projects add column if not exists legacy_owner_pending boolean not null default false;
alter table public.projects drop constraint if exists projects_owner_required;
alter table public.projects add constraint projects_owner_required check(owner_id is not null or legacy_owner_pending);
alter table public.projects drop constraint if exists projects_pending_import_private;
alter table public.projects add constraint projects_pending_import_private check(not legacy_owner_pending or (owner_id is null and visibility='private' and publication_status='draft'));
create table if not exists public.project_legacy_imports (
 project_id uuid primary key references public.projects(id) on delete cascade,
 original_record jsonb not null,
 imported_at timestamptz not null default now()
);
alter table public.project_legacy_imports enable row level security;
revoke all on public.project_legacy_imports from anon,authenticated;

-- A deleted project's URL must never silently point to a different project.
-- Reservations hold only identifiers and remain inaccessible to API clients.
create table if not exists public.project_slug_reservations (
 slug text primary key,
 project_id uuid not null unique,
 reserved_at timestamptz not null default now()
);
alter table public.project_slug_reservations enable row level security;
revoke all on public.project_slug_reservations from anon,authenticated;
insert into public.project_slug_reservations(slug,project_id) select slug,id from public.projects on conflict do nothing;
create or replace function public.reserve_project_slug()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.project_slug_reservations(slug,project_id) values(new.slug,new.id);
 return new;
end;
$$;
drop trigger if exists projects_reserve_slug on public.projects;
create trigger projects_reserve_slug after insert on public.projects for each row execute function public.reserve_project_slug();

-- Ownership lives only in projects.owner_id. There is no duplicate owner role
-- that can drift out of sync when a project changes hands.
create table if not exists public.project_members (
 project_id uuid not null references public.projects(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 role text not null check(role in('maintainer','contributor')),
 added_by uuid references public.profiles(id) on delete set null,
 joined_at timestamptz not null default now(),
 primary key(project_id,profile_id)
);
create table if not exists public.project_audit_events (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 event_type text not null check(event_type in('created','updated','published','unpublished','archived','restored','ownership_transferred','member_added','member_role_changed','member_removed','member_left','legacy_owner_assigned')),
 subject_id uuid references public.profiles(id) on delete set null,
 changed_fields text[] not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.project_audit_events drop constraint if exists project_audit_events_event_type_check;
alter table public.project_audit_events add constraint project_audit_events_event_type_check check(event_type in('created','updated','published','unpublished','archived','restored','ownership_transferred','member_added','member_role_changed','member_removed','member_left','legacy_owner_assigned'));
create index if not exists projects_owner_recent_idx on public.projects(owner_id,created_at desc,id desc);
create index if not exists projects_public_recent_idx on public.projects(created_at desc,id desc) where visibility='public' and publication_status='published' and archived_at is null;
create index if not exists project_members_profile_idx on public.project_members(profile_id,project_id);
create index if not exists project_audit_recent_idx on public.project_audit_events(project_id,created_at desc,id desc);
create index if not exists projects_technologies_idx on public.projects using gin(technologies);

create or replace function public.normalize_project_technologies(p_values text[])
returns text[] language plpgsql immutable set search_path='' as $$
declare result text[];
begin
 if cardinality(coalesce(p_values,'{}'::text[]))>20 then raise exception 'Choose at most 20 technologies.' using errcode='22023'; end if;
 if exists(select 1 from unnest(coalesce(p_values,'{}'::text[])) value where value is null or char_length(btrim(value)) not between 1 and 40) then
  raise exception 'Technology names must be between 1 and 40 characters.' using errcode='22023';
 end if;
 select coalesce(array_agg(value order by value),'{}'::text[]) into result from(select distinct lower(btrim(value)) value from unnest(coalesce(p_values,'{}'::text[])) value) normalized;
 return result;
end;
$$;

create or replace function public.can_read_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects p where p.id=p_project_id and (
  p.owner_id=auth.uid()
  or exists(select 1 from public.project_members m where m.project_id=p.id and m.profile_id=auth.uid() and m.role='maintainer')
  or (p.publication_status='published' and (p.visibility='public' or exists(select 1 from public.project_members m where m.project_id=p.id and m.profile_id=auth.uid())))
 ));
$$;
create or replace function public.can_manage_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects p where p.id=p_project_id and (p.owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=p.id and m.profile_id=auth.uid() and m.role='maintainer')));
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_audit_events enable row level security;
revoke all on public.projects,public.project_members,public.project_audit_events from anon,authenticated;
grant select on public.projects,public.project_members to anon,authenticated;
grant select on public.project_audit_events to authenticated;
drop policy if exists "Read accessible Projects" on public.projects;
create policy "Read accessible Projects" on public.projects for select to anon,authenticated using(public.can_read_project(id));
drop policy if exists "Read accessible Project teams" on public.project_members;
create policy "Read accessible Project teams" on public.project_members for select to anon,authenticated using(public.can_read_project(project_id));
drop policy if exists "Managers can read Project audit" on public.project_audit_events;
create policy "Managers can read Project audit" on public.project_audit_events for select to authenticated using(public.can_manage_project(project_id));

create or replace function public.guard_project_record()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.name:=btrim(new.name); new.tagline:=btrim(new.tagline); new.description:=btrim(new.description);
 new.technologies:=public.normalize_project_technologies(new.technologies);
 if tg_op='INSERT' then
  new:=jsonb_populate_record(new,jsonb_build_object('title',new.name));
 elsif new.name is distinct from old.name then
  new:=jsonb_populate_record(new,jsonb_build_object('title',new.name));
 end if;
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.slug is distinct from old.slug or new.created_at is distinct from old.created_at then
   raise exception 'Project identity and URL cannot be changed.' using errcode='22023';
  end if;
  new.version:=old.version+1; new.updated_at:=clock_timestamp();
 end if;
 return new;
end;
$$;
drop trigger if exists projects_guard_record on public.projects;
create trigger projects_guard_record before insert or update on public.projects for each row execute function public.guard_project_record();
create or replace function public.guard_project_member()
returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.projects p where p.id=new.project_id and p.owner_id=new.profile_id) then
  raise exception 'The owner is already part of the project.' using errcode='22023';
 end if;
 return new;
end;
$$;
drop trigger if exists project_members_guard on public.project_members;
create trigger project_members_guard before insert or update on public.project_members for each row execute function public.guard_project_member();

create or replace function public.record_project_audit()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind text; fields text[]:='{}';
begin
 if tg_op='INSERT' then kind:='created';
 else
  if old.owner_id is distinct from new.owner_id then kind:=case when old.legacy_owner_pending then 'legacy_owner_assigned' else 'ownership_transferred' end; fields:=array_append(fields,'owner_id');
  elsif old.archived_at is distinct from new.archived_at then kind:=case when new.archived_at is null then 'restored' else 'archived' end; fields:=array_append(fields,'archived_at');
  elsif old.publication_status is distinct from new.publication_status then kind:=case when new.publication_status='published' then 'published' else 'unpublished' end; fields:=array_append(fields,'publication_status');
  else kind:='updated'; end if;
  if old.name is distinct from new.name then fields:=array_append(fields,'name'); end if;
  if old.tagline is distinct from new.tagline then fields:=array_append(fields,'tagline'); end if;
  if old.description is distinct from new.description then fields:=array_append(fields,'description'); end if;
  if old.technologies is distinct from new.technologies then fields:=array_append(fields,'technologies'); end if;
  if old.visibility is distinct from new.visibility then fields:=array_append(fields,'visibility'); end if;
  if old.stage is distinct from new.stage then fields:=array_append(fields,'stage'); end if;
 end if;
 if tg_op='UPDATE' and cardinality(fields)=0 then return new; end if;
 insert into public.project_audit_events(project_id,actor_id,event_type,changed_fields) values(new.id,(select id from public.profiles where id=auth.uid()),kind,fields);
 return new;
end;
$$;
drop trigger if exists projects_audit on public.projects;
create trigger projects_audit after insert or update on public.projects for each row execute function public.record_project_audit();

-- All writes go through authenticated RPCs. Clients cannot insert a project with
-- another owner, write team roles directly, or fabricate audit records.
create or replace function public.create_project(p_name text,p_slug text default null,p_tagline text default '',p_description text default '',p_technologies text[] default '{}',p_visibility text default 'private',p_stage text default 'idea')
returns public.projects language plpgsql security definer set search_path='' as $$
declare result public.projects%rowtype; new_id uuid:=gen_random_uuid(); new_slug text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Sign in and complete your Devvrats profile first.' using errcode='42501'; end if;
 if p_slug is null then
  new_slug:=btrim(left(regexp_replace(lower(coalesce(p_name,'project')),'[^a-z0-9]+','-','g'),60),'-');
  new_slug:=coalesce(nullif(new_slug,''),'project')||'-'||left(replace(new_id::text,'-',''),8);
 else new_slug:=lower(btrim(p_slug)); end if;
 insert into public.projects(id,slug,owner_id,created_by,name,tagline,description,technologies,visibility,stage)
 values(new_id,new_slug,auth.uid(),auth.uid(),p_name,coalesce(p_tagline,''),coalesce(p_description,''),public.normalize_project_technologies(p_technologies),p_visibility,p_stage) returning * into result;
 return result;
end;
$$;

create or replace function public.save_project(p_project_id uuid,p_expected_version bigint,p_name text,p_tagline text,p_description text,p_technologies text[],p_visibility text,p_stage text)
returns public.projects language plpgsql security definer set search_path='' as $$
declare result public.projects%rowtype;
begin
 select * into result from public.projects where id=p_project_id for update;
 if not found or not public.can_manage_project(p_project_id) then raise exception 'You cannot edit this project.' using errcode='42501'; end if;
 if result.archived_at is not null then raise exception 'Restore this project before editing it.' using errcode='55000'; end if;
 if p_expected_version is distinct from result.version then raise exception 'This project changed. Reload before saving.' using errcode='40001'; end if;
 if p_visibility is distinct from result.visibility and result.owner_id is distinct from auth.uid() then raise exception 'Only the owner can change visibility.' using errcode='42501'; end if;
 update public.projects set name=p_name,tagline=p_tagline,description=p_description,technologies=p_technologies,visibility=p_visibility,stage=p_stage where id=p_project_id returning * into result;
 return result;
end;
$$;
create or replace function public.set_project_publication(p_project_id uuid,p_expected_version bigint,p_published boolean)
returns public.projects language plpgsql security definer set search_path='' as $$
declare result public.projects%rowtype;
begin
 select * into result from public.projects where id=p_project_id for update;
 if not found or result.owner_id is distinct from auth.uid() then raise exception 'Only the owner can publish or unpublish this project.' using errcode='42501'; end if;
 if result.archived_at is not null then raise exception 'Restore this project before publishing it.' using errcode='55000'; end if;
 if p_expected_version is distinct from result.version then raise exception 'This project changed. Reload before saving.' using errcode='40001'; end if;
 if p_published is null then raise exception 'Choose whether to publish this project.' using errcode='22023'; end if;
 update public.projects set publication_status=case when p_published then 'published' else 'draft' end,published_at=case when p_published then coalesce(published_at,now()) else published_at end where id=p_project_id returning * into result;
 return result;
end;
$$;
create or replace function public.set_project_archived(p_project_id uuid,p_expected_version bigint,p_archived boolean)
returns public.projects language plpgsql security definer set search_path='' as $$
declare result public.projects%rowtype;
begin
 select * into result from public.projects where id=p_project_id for update;
 if not found or result.owner_id is distinct from auth.uid() then raise exception 'Only the owner can archive or restore this project.' using errcode='42501'; end if;
 if p_expected_version is distinct from result.version then raise exception 'This project changed. Reload before saving.' using errcode='40001'; end if;
 if p_archived is null then raise exception 'Choose whether to archive this project.' using errcode='22023'; end if;
 update public.projects set archived_at=case when p_archived then coalesce(archived_at,now()) else null end where id=p_project_id returning * into result;
 return result;
end;
$$;

create or replace function public.set_project_member(p_project_id uuid,p_profile_id uuid,p_role text)
returns void language plpgsql security definer set search_path='' as $$
declare project public.projects%rowtype; previous_role text;
begin
 select * into project from public.projects where id=p_project_id for update;
 if not found or project.owner_id is distinct from auth.uid() then raise exception 'Only the owner can manage the project team.' using errcode='42501'; end if;
 if project.archived_at is not null then raise exception 'Restore this project before changing its team.' using errcode='55000'; end if;
 if p_profile_id=project.owner_id then raise exception 'Use ownership transfer to change the owner.' using errcode='22023'; end if;
 if p_role is null or p_role not in('maintainer','contributor') then raise exception 'Choose a maintainer or contributor role.' using errcode='22023'; end if;
 select role into previous_role from public.project_members where project_id=p_project_id and profile_id=p_profile_id;
 if previous_role=p_role then return; end if;
 insert into public.project_members(project_id,profile_id,role,added_by) values(p_project_id,p_profile_id,p_role,auth.uid()) on conflict(project_id,profile_id) do update set role=excluded.role;
 insert into public.project_audit_events(project_id,actor_id,event_type,subject_id,changed_fields) values(p_project_id,auth.uid(),case when previous_role is null then 'member_added' else 'member_role_changed' end,p_profile_id,array['role']);
end;
$$;
create or replace function public.remove_project_member(p_project_id uuid,p_profile_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare project public.projects%rowtype;
begin
 select * into project from public.projects where id=p_project_id for update;
 if not found or (project.owner_id is distinct from auth.uid() and p_profile_id is distinct from auth.uid()) or auth.uid() is null then raise exception 'You cannot remove this project member.' using errcode='42501'; end if;
 if p_profile_id=project.owner_id then raise exception 'Transfer ownership before leaving this project.' using errcode='22023'; end if;
 -- Members can leave an archived project, but managers cannot change its team.
 if project.archived_at is not null and p_profile_id is distinct from auth.uid() then raise exception 'Restore this project before changing its team.' using errcode='55000'; end if;
 delete from public.project_members where project_id=p_project_id and profile_id=p_profile_id;
 if found then insert into public.project_audit_events(project_id,actor_id,event_type,subject_id) values(p_project_id,auth.uid(),case when p_profile_id=auth.uid() then 'member_left' else 'member_removed' end,p_profile_id); end if;
end;
$$;
create or replace function public.transfer_project_ownership(p_project_id uuid,p_expected_version bigint,p_new_owner uuid,p_confirmation text)
returns public.projects language plpgsql security definer set search_path='' as $$
declare result public.projects%rowtype; previous_owner uuid;
begin
 select * into result from public.projects where id=p_project_id for update;
 if not found or result.owner_id is distinct from auth.uid() then raise exception 'Only the owner can transfer this project.' using errcode='42501'; end if;
 if p_expected_version is distinct from result.version then raise exception 'This project changed. Reload before transferring it.' using errcode='40001'; end if;
 if p_confirmation is distinct from result.name then raise exception 'Enter the project name to confirm.' using errcode='22023'; end if;
 if p_new_owner=result.owner_id or not exists(select 1 from public.project_members where project_id=p_project_id and profile_id=p_new_owner) then raise exception 'Choose an existing project team member.' using errcode='22023'; end if;
 previous_owner:=result.owner_id;
 delete from public.project_members where project_id=p_project_id and profile_id=p_new_owner;
 update public.projects set owner_id=p_new_owner where id=p_project_id returning * into result;
 insert into public.project_members(project_id,profile_id,role,added_by) values(p_project_id,previous_owner,'maintainer',auth.uid());
 return result;
end;
$$;
create or replace function public.delete_project(p_project_id uuid,p_expected_version bigint,p_confirmation text)
returns void language plpgsql security definer set search_path='' as $$
declare project public.projects%rowtype;
begin
 select * into project from public.projects where id=p_project_id for update;
 if not found or project.owner_id is distinct from auth.uid() then raise exception 'Only the owner can delete this project.' using errcode='42501'; end if;
 if p_expected_version is distinct from project.version then raise exception 'This project changed. Reload before deleting it.' using errcode='40001'; end if;
 if p_confirmation is distinct from project.name then raise exception 'Enter the project name to confirm.' using errcode='22023'; end if;
 delete from public.projects where id=p_project_id;
end;
$$;

create or replace function public.list_projects(p_scope text default 'public',p_limit integer default 20,p_after_created_at timestamptz default null,p_after_id uuid default null)
returns setof public.projects language plpgsql stable security definer set search_path='' as $$
begin
 if p_scope is null or p_scope not in('public','mine') then raise exception 'Choose public or your projects.' using errcode='22023'; end if;
 if p_scope='mine' and auth.uid() is null then raise exception 'Sign in to view your projects.' using errcode='42501'; end if;
 if (p_after_created_at is null)<>(p_after_id is null) then raise exception 'Provide both pagination cursor fields.' using errcode='22023'; end if;
 return query select p.* from public.projects p where (
  (p_scope='public' and p.visibility='public' and p.publication_status='published' and p.archived_at is null)
  or (p_scope='mine' and public.can_read_project(p.id) and (p.owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=p.id and m.profile_id=auth.uid())))
 ) and (p_after_created_at is null or (p.created_at,p.id)<(p_after_created_at,p_after_id))
 order by p.created_at desc,p.id desc limit greatest(1,least(coalesce(p_limit,20),100));
end;
$$;

create or replace function public.get_project_team(p_project_id uuid)
returns table(profile_id uuid,name text,username text,avatar_url text,role text,joined_at timestamptz)
language sql stable security definer set search_path='' as $$
 select identity.id,identity.name,identity.username,identity.avatar_url,'owner'::text,p.created_at
 from public.projects p join public.profiles identity on identity.id=p.owner_id
 where p.id=p_project_id and public.can_read_project(p.id)
 union all
 select identity.id,identity.name,identity.username,identity.avatar_url,m.role,m.joined_at
 from public.project_members m join public.profiles identity on identity.id=m.profile_id
 where m.project_id=p_project_id and public.can_read_project(m.project_id);
$$;

-- SQL-editor/service administration only. There is no public claim button or
-- client-callable function that can take ownership of someone else's imports.
create or replace function public.assign_legacy_project_owner(p_project_id uuid,p_owner_profile_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare project public.projects%rowtype;
begin
 select * into project from public.projects where id=p_project_id for update;
 if not found or not project.legacy_owner_pending then raise exception 'This is not an unassigned legacy project.' using errcode='22023'; end if;
 if p_owner_profile_id is null or not exists(select 1 from public.profiles where id=p_owner_profile_id) then raise exception 'Choose an existing Devvrats profile.' using errcode='22023'; end if;
 update public.projects set owner_id=p_owner_profile_id,legacy_owner_pending=false where id=p_project_id;
end;
$$;
revoke all on function public.assign_legacy_project_owner(uuid,uuid) from public,anon,authenticated;

revoke all on function public.reserve_project_slug(),public.normalize_project_technologies(text[]),public.can_read_project(uuid),public.can_manage_project(uuid),public.guard_project_record(),public.guard_project_member(),public.record_project_audit(),public.create_project(text,text,text,text,text[],text,text),public.save_project(uuid,bigint,text,text,text,text[],text,text),public.set_project_publication(uuid,bigint,boolean),public.set_project_archived(uuid,bigint,boolean),public.set_project_member(uuid,uuid,text),public.remove_project_member(uuid,uuid),public.transfer_project_ownership(uuid,bigint,uuid,text),public.delete_project(uuid,bigint,text),public.list_projects(text,integer,timestamptz,uuid),public.get_project_team(uuid) from public,anon,authenticated;
grant execute on function public.can_read_project(uuid),public.list_projects(text,integer,timestamptz,uuid),public.get_project_team(uuid) to anon,authenticated;
grant execute on function public.can_manage_project(uuid),public.create_project(text,text,text,text,text[],text,text),public.save_project(uuid,bigint,text,text,text,text[],text,text),public.set_project_publication(uuid,bigint,boolean),public.set_project_archived(uuid,bigint,boolean),public.set_project_member(uuid,uuid,text),public.remove_project_member(uuid,uuid),public.transfer_project_ownership(uuid,bigint,uuid,text),public.delete_project(uuid,bigint,text) to authenticated;
commit;
