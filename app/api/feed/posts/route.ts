import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const view = params.get("view");
  const after = params.get("after");
  const afterId = params.get("id");
  if ((view !== "conversation" && view !== "project") || !after || !ISO_TIMESTAMP.test(after) || Number.isNaN(Date.parse(after)) || !afterId || !UUID.test(afterId)) {
    return NextResponse.json({ error: "This Feed page request is invalid." }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from("feed_posts")
    .select("id, author_id, clan_id, post_type, title, body, resource_kind, resource_url, resource_label, created_at")
    .is("clan_id", null)
    .eq("post_type", view)
    .or(`created_at.lt.${after},and(created_at.eq.${after},id.lt.${afterId})`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (error) return NextResponse.json({ error: "Feed posts couldn’t be loaded. Please try again." }, { status: 503 });

  const hasMore = (rows?.length ?? 0) > PAGE_SIZE;
  const page = (rows ?? []).slice(0, PAGE_SIZE);
  const postIds = page.map((post) => post.id);
  const profileIds = new Set(page.map((post) => post.author_id));
  const [repliesResult, commentsResult] = postIds.length
    ? await Promise.all([
        supabase.from("feed_replies").select("id, post_id, author_id, body, created_at").in("post_id", postIds).order("created_at", { ascending: true }),
        supabase.from("feed_comments").select("id, post_id, author_id, body, created_at").in("post_id", postIds).order("created_at", { ascending: true }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (repliesResult.error || commentsResult.error) {
    return NextResponse.json({ error: "Feed conversations couldn’t be loaded. Please try again." }, { status: 503 });
  }

  for (const item of [...(repliesResult.data ?? []), ...(commentsResult.data ?? [])]) profileIds.add(item.author_id);
  const { data: profiles, error: profilesError } = profileIds.size
    ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", [...profileIds])
    : { data: [], error: null };
  if (profilesError) return NextResponse.json({ error: "Feed profiles couldn’t be loaded. Please try again." }, { status: 503 });

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const authorFor = (id: string) => {
    const profile = byId.get(id);
    return { id, name: profile?.name ?? "Community member", username: profile?.username ?? "member", avatarUrl: profile?.avatar_url ?? null };
  };
  const posts = page.map((post) => ({
    ...post,
    author: authorFor(post.author_id),
    replies: (repliesResult.data ?? []).filter((reply) => reply.post_id === post.id).map((reply) => ({ ...reply, author: authorFor(reply.author_id) })),
    comments: (commentsResult.data ?? []).filter((comment) => comment.post_id === post.id).map((comment) => ({ ...comment, author: authorFor(comment.author_id) })),
  }));
  const last = page.at(-1);

  return NextResponse.json({
    posts,
    hasMore,
    nextCursor: last ? { createdAt: last.created_at, id: last.id } : null,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
