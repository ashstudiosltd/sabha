-- Give Anu bounded access to public Sabha Feed records without exposing
-- private Clan posts through broad table access.
create or replace function public.get_public_feed_for_anu(
  p_search_terms text[] default '{}',
  p_focus_id uuid default null,
  p_limit integer default 6
)
returns table (
  id uuid,
  title text,
  body text,
  clan_id uuid,
  author_id uuid,
  created_at timestamptz,
  discussion jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with bounded_terms as (
    select term
    from unnest(coalesce(p_search_terms, '{}')) as terms(term)
    where char_length(term) between 3 and 48
    limit 8
  ), visible_posts as (
    select post.*
    from public.feed_posts post
    where (post.clan_id is null or public.is_public_clan(post.clan_id))
      and (
        (p_focus_id is not null and post.id = p_focus_id)
        or p_focus_id is null and (
          not exists (select 1 from bounded_terms)
          or exists (
            select 1 from bounded_terms term
            where post.title ilike '%' || term.term || '%'
               or post.body ilike '%' || term.term || '%'
          )
        )
      )
    order by post.created_at desc, post.id desc
    limit greatest(1, least(coalesce(p_limit, 6), 6))
  )
  select post.id, post.title, post.body, post.clan_id, post.author_id, post.created_at,
    jsonb_build_object(
      'author', jsonb_build_object(
        'name', coalesce(author.name, 'Community member'),
        'username', coalesce(author.username, 'member')
      ),
      'replies', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', reply.id, 'author_id', reply.author_id, 'body', reply.body,
          'created_at', reply.created_at, 'author_name', coalesce(reply_author.name, 'Community member'),
          'author_username', coalesce(reply_author.username, 'member')
        ) order by reply.created_at desc)
        from (
          select * from public.feed_replies r where r.post_id = post.id order by r.created_at desc limit 8
        ) reply
        left join public.profiles reply_author on reply_author.id = reply.author_id
      ), '[]'::jsonb),
      'comments', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', comment.id, 'author_id', comment.author_id, 'body', comment.body,
          'created_at', comment.created_at, 'author_name', coalesce(comment_author.name, 'Community member'),
          'author_username', coalesce(comment_author.username, 'member')
        ) order by comment.created_at desc)
        from (
          select * from public.feed_comments c where c.post_id = post.id order by c.created_at desc limit 8
        ) comment
        left join public.profiles comment_author on comment_author.id = comment.author_id
      ), '[]'::jsonb)
    ) as discussion
  from visible_posts post
  left join public.profiles author on author.id = post.author_id;
$$;

revoke all on function public.get_public_feed_for_anu(text[], uuid, integer) from public;
grant execute on function public.get_public_feed_for_anu(text[], uuid, integer) to anon, authenticated;
