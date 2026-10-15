begin;
create index if not exists projects_public_updated_idx on public.projects(updated_at desc,id desc) where visibility='public' and publication_status='published' and archived_at is null;
create index if not exists projects_owner_updated_idx on public.projects(owner_id,updated_at desc,id desc);
create index if not exists project_members_profile_project_idx on public.project_members(profile_id,project_id);
create or replace function public.search_project_catalog(p_scope text default 'public',p_query text default '',p_stage text default '',p_technology text default '',p_status text default 'all',p_relation text default 'all',p_sort text default 'recent',p_cursor jsonb default null,p_limit integer default 20)
returns table(project jsonb,relevance_score integer,sort_at timestamptz,sort_name text)
language plpgsql stable security invoker set search_path='' as $$
declare q text:=lower(btrim(coalesce(p_query,''))); tech text:=lower(btrim(coalesce(p_technology,'')));
begin
 if p_scope not in('public','mine') or p_scope is null or (p_scope='mine' and auth.uid() is null) then raise exception 'Choose an available project collection.' using errcode='42501'; end if;
 if length(q)>100 or length(tech)>40 or p_sort not in('recent','newest','name','relevance') or p_status not in('all','draft','published','archived') or p_relation not in('all','owned','collaborating') then raise exception 'Invalid project filters.' using errcode='22023'; end if;
 if p_stage<>'' and p_stage not in('idea','prototype','building','launched','maintaining','paused','completed') then raise exception 'Invalid project stage.' using errcode='22023'; end if;
 if p_cursor is not null and (jsonb_typeof(p_cursor)<>'object' or not(p_cursor ?& array['id','score','at','name'])) then raise exception 'Invalid project cursor.' using errcode='22023'; end if;
 return query with eligible as (
 select p.*,case when q='' then 0 else
  (case when lower(p.name)=q then 100 when starts_with(lower(p.name),q) then 60 when strpos(lower(p.name),q)>0 then 40 else 0 end)
  +(case when exists(select 1 from unnest(p.technologies) t where strpos(lower(t),q)>0) then 30 else 0 end)
  +(case when strpos(lower(p.tagline),q)>0 then 20 else 0 end)
  +(case when strpos(lower(p.description),q)>0 then 5 else 0 end) end as score
 from public.projects p where (
 (p_scope='public' and p.visibility='public' and p.publication_status='published' and p.archived_at is null)
 or (p_scope='mine' and (p.owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=p.id and m.profile_id=auth.uid())))
 ) and (coalesce(p_stage,'')='' or p.stage=p_stage)
 and (tech='' or exists(select 1 from unnest(p.technologies) t where lower(t)=tech))
 and (p_scope='public' or case p_status when 'archived' then p.archived_at is not null when 'draft' then p.publication_status='draft' and p.archived_at is null when 'published' then p.publication_status='published' and p.archived_at is null else true end)
 and (p_scope='public' or p_relation='all' or (p_relation='owned' and p.owner_id=auth.uid()) or (p_relation='collaborating' and p.owner_id is distinct from auth.uid()))
 ), ranked as (
 select e.*,case when p_sort='relevance' then e.score else 0 end as ordered_score,
 case when p_sort='name' then '1970-01-01'::timestamptz when p_sort='newest' then e.created_at else e.updated_at end as ordered_at,
 case when p_sort='name' then lower(e.name) else '' end as ordered_name from eligible e where q='' or e.score>0
 )
 select to_jsonb(r)-array['score','ordered_score','ordered_at','ordered_name'],r.ordered_score,r.ordered_at,r.ordered_name from ranked r
 where p_cursor is null or r.ordered_score<(p_cursor->>'score')::integer
 or (r.ordered_score=(p_cursor->>'score')::integer and r.ordered_at<(p_cursor->>'at')::timestamptz)
 or (r.ordered_score=(p_cursor->>'score')::integer and r.ordered_at=(p_cursor->>'at')::timestamptz and r.ordered_name>(p_cursor->>'name'))
 or (r.ordered_score=(p_cursor->>'score')::integer and r.ordered_at=(p_cursor->>'at')::timestamptz and r.ordered_name=(p_cursor->>'name') and r.id<(p_cursor->>'id')::uuid)
 order by r.ordered_score desc,r.ordered_at desc,r.ordered_name asc,r.id desc limit greatest(1,least(coalesce(p_limit,20),50));
end;
$$;
create or replace function public.project_workspace_counts()
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('all',count(*),'draft',count(*) filter(where publication_status='draft' and archived_at is null),'published',count(*) filter(where publication_status='published' and archived_at is null),'archived',count(*) filter(where archived_at is not null),'owned',count(*) filter(where owner_id=auth.uid()),'collaborating',count(*) filter(where owner_id is distinct from auth.uid()))
 from public.projects p where auth.uid() is not null and (p.owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=p.id and m.profile_id=auth.uid()));
$$;
revoke all on function public.search_project_catalog(text,text,text,text,text,text,text,jsonb,integer),public.project_workspace_counts() from public,anon,authenticated;
grant execute on function public.search_project_catalog(text,text,text,text,text,text,text,jsonb,integer) to anon,authenticated;
grant execute on function public.project_workspace_counts() to authenticated;
notify pgrst,'reload schema';
commit;
