import { redirect } from "next/navigation";

import FeedExperience from "@/components/feed/feed-experience";
import ClanDirectory, { type ClanSummary } from "@/components/feed/clan-directory";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import { createClient } from "@/lib/supabase/server";
import styles from "./feed.module.css";

export const dynamic = "force-dynamic";

interface FeedPageProps {
  searchParams: Promise<{ view?: string | string[]; q?: string | string[] }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const view = requestedView === "clans" ? "clans" : requestedView === "project" || requestedView === "project-up" ? "project" : "conversation";
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().toLowerCase() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth?next=%2Ffeed");

  if (view === "clans") {
    const [profileResult, clansResult, privateClansResult, membershipsResult] = await Promise.all([
      supabase.from("profiles").select("id, name, username, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.rpc("get_public_clan_summaries"),
      supabase.rpc("get_my_private_clan_summaries"),
      supabase.from("clan_members").select("clan_id").eq("user_id", user.id),
    ]);
    const currentProfile = profileResult.data
      ? {
          id: profileResult.data.id,
          name: profileResult.data.name ?? user.user_metadata?.name ?? "Community member",
          username: profileResult.data.username ?? "member",
          avatarUrl: profileResult.data.avatar_url ?? null,
        }
      : {
          id: user.id,
          name: user.user_metadata?.name ?? "Community member",
          username: "member",
          avatarUrl: null,
        };
    const allClans = [...(clansResult.data ?? []), ...(privateClansResult.data ?? [])] as ClanSummary[];
    const hasAnyClans = allClans.length > 0;
    const needle = query.toLowerCase();
    const clans = allClans.filter((clan) =>
      !needle || `${clan.name} ${clan.description}`.toLowerCase().includes(needle)
    );
    const setupRequired = !!clansResult.error || !!privateClansResult.error || !!membershipsResult.error;

    return (
      <main className="sabha-design min-h-screen">
        <SabhaNavbar section="feed" feedView="clans" showClanCreateAction={hasAnyClans} initialQuery={query} />
        <ClanDirectory
          clans={clans}
          hasAnyClans={hasAnyClans}
          memberClanIds={(membershipsResult.data ?? []).map((membership) => membership.clan_id)}
          currentUserId={currentProfile.id}
          query={query}
          loadError={setupRequired}
        />
      </main>
    );
  }

  const [profileResult, postsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("feed_posts")
      .select("id, author_id, clan_id, post_type, title, body, resource_kind, resource_url, resource_label, created_at")
      .is("clan_id", null)
      .eq("post_type", view)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50),
  ]);

  const authorIds = [...new Set((postsResult.data ?? []).map((post) => post.author_id))];
  const postIds = (postsResult.data ?? []).map((post) => post.id);
  const repliesResult = postIds.length
    ? await supabase
        .from("feed_replies")
        .select("id, post_id, author_id, body, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  const commentsResult = postIds.length
    ? await supabase
        .from("feed_comments")
        .select("id, post_id, author_id, body, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  const replyAuthorIds = (repliesResult.data ?? []).map((reply) => reply.author_id);
  const commentAuthorIds = (commentsResult.data ?? []).map((comment) => comment.author_id);
  const profileIds = [...new Set([...authorIds, ...replyAuthorIds, ...commentAuthorIds])];
  const authorsResult = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, name, username, avatar_url")
        .in("id", profileIds)
    : { data: [], error: null };
  const authors = new Map((authorsResult.data ?? []).map((profile) => [profile.id, profile]));

  const getAuthor = (authorId: string) => {
    const author = authors.get(authorId);
    return {
      id: authorId,
      name: author?.name ?? "Community member",
      username: author?.username ?? "member",
      avatarUrl: author?.avatar_url ?? null,
    };
  };

  const posts = (postsResult.data ?? []).map((post) => {
    return {
      ...post,
      author: getAuthor(post.author_id),
      replies: (repliesResult.data ?? [])
        .filter((reply) => reply.post_id === post.id)
        .map((reply) => ({ ...reply, author: getAuthor(reply.author_id) })),
      comments: (commentsResult.data ?? [])
        .filter((comment) => comment.post_id === post.id)
        .map((comment) => ({ ...comment, author: getAuthor(comment.author_id) })),
    };
  }).filter((post) => !query || [post.title, post.body, post.author.name, post.author.username].some((value) => value?.toLowerCase().includes(query)));

  const currentProfile = profileResult.data
    ? {
        id: profileResult.data.id,
        name: profileResult.data.name ?? user.user_metadata?.name ?? "Community member",
        username: profileResult.data.username ?? "member",
        avatarUrl: profileResult.data.avatar_url ?? null,
      }
    : {
        id: user.id,
        name: user.user_metadata?.name ?? "Community member",
        username: "member",
        avatarUrl: null,
      };

  const setupRequired = [postsResult.error, repliesResult.error, commentsResult.error].some((error) => error && ["42P01", "42703"].includes(error.code ?? ""));

  return (
    <main className="sabha-design">
      <SabhaNavbar section="feed" feedView={view} initialQuery={query} />
      <div className={styles.page}>
        <FeedExperience
          key={view}
          currentProfile={currentProfile}
          activeView={view}
          initialPosts={posts}
          initialHasMore={(postsResult.data?.length ?? 0) === 50}
          initialCursor={postsResult.data?.length ? { createdAt: postsResult.data.at(-1)!.created_at, id: postsResult.data.at(-1)!.id } : null}
          searchQuery={query}
          loadError={setupRequired ? "setup" : postsResult.error || repliesResult.error || commentsResult.error ? "load" : null}
        />
      </div>
    </main>
  );
}
