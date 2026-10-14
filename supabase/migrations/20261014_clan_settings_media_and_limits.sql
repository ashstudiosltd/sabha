-- Clan settings: support a practical 200-word description in both the app and DB.

alter table public.clans
  drop constraint if exists clans_description_check;

alter table public.clans
  add constraint clans_description_check
  check (
    char_length(description) <= 3000
    and (
      btrim(description) = ''
      or array_length(regexp_split_to_array(btrim(description), '\s+'), 1) <= 200
    )
  );

create or replace function public.create_clan(
  p_name text,
  p_slug text,
  p_description text default '',
  p_visibility text default 'public',
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_clan_id uuid;
  clean_description text := btrim(coalesce(p_description, ''));
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Clan.' using errcode = '28000';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 then
    raise exception 'Clan names must be between 2 and 60 characters.' using errcode = '22023';
  end if;
  if char_length(clean_description) > 3000 or (
    clean_description <> ''
    and array_length(regexp_split_to_array(clean_description, '\s+'), 1) > 200
  ) then
    raise exception 'Clan descriptions must be 200 words or fewer.' using errcode = '22023';
  end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Choose a valid Clan URL.' using errcode = '22023';
  end if;
  if p_visibility not in ('public', 'private') then
    raise exception 'Choose public or private visibility.' using errcode = '22023';
  end if;
  if p_avatar_url is not null and (p_avatar_url !~* '^https://' or char_length(p_avatar_url) > 2048) then
    raise exception 'Clan avatar must be a valid HTTPS URL.' using errcode = '22023';
  end if;

  insert into public.clans (name, slug, description, created_by, visibility, avatar_url)
  values (btrim(p_name), p_slug, clean_description, auth.uid(), p_visibility, nullif(btrim(p_avatar_url), ''))
  returning id into new_clan_id;

  return new_clan_id;
end;
$$;

revoke all on function public.create_clan(text, text, text, text, text) from public;
grant execute on function public.create_clan(text, text, text, text, text) to authenticated;
