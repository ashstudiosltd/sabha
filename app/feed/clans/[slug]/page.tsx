import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import Image from "next/image";

import ClanJoinButton from "@/components/feed/clan-join-button";
import ClanManagement, { type ClanMemberSummary } from "@/components/feed/clan-management";
import FeedExperience from "@/components/feed/feed-experience";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import { createClient } from "@/lib/supabase/server";
import styles from "../../feed.module.css";

interface ClanPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function ClanPage({ params }: ClanPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/feed/clans/${slug}`)}`);

  const [clanResult, profileResult] = await Promise.all([
    supabase.from("clans").select("id, slug, name, description, created_by, created_at, visibility, avatar_url").eq("slug", slug).maybeSingle(),
    supabase.from("profiles").select("id, name, username, avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  const clan = clanResult.data;
  if (!clan) notFound();

  const [membershipResult, memberCountResult, ownerResult, postsResult] = await Promise.all([
    supabase.from("clan_members").select("role").eq("clan_id", clan.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("clan_members").select("user_id", { count: "exact", head: true }).eq("clan_id", clan.id),
    supabase.from("profiles").select("name, username").eq("id", clan.created_by).maybeSingle(),
    supabase.from("feed_posts").select("id, author_id, clan_id, post_type, title, body, resource_kind, resource_url, resource_label, created_at").eq("clan_id", clan.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const isMember = !!membershipResult.data;
  const currentRole = membershipResult.data?.role as ClanMemberSummary["role"] | undefined;
  const canManage = currentRole === "owner" || currentRole === "admin";
  const canModerate = canManage || currentRole === "moderator";
  const membersResult = canManage
    ? await supabase.from("clan_members").select("user_id, role").eq("clan_id", clan.id).order("joined_at", { ascending: true }).limit(100)
    : { data: [], error: null };
  const memberIds = (membersResult.data ?? []).map((member) => member.user_id);
  const memberProfilesResult = memberIds.length
    ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", memberIds)
    : { data: [], error: null };
  const memberProfiles = new Map((memberProfilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const roster: ClanMemberSummary[] = (membersResult.data ?? []).map((member) => {
    const profile = memberProfiles.get(member.user_id);
    return {
      user_id: member.user_id,
      role: member.role as ClanMemberSummary["role"],
      name: profile?.name ?? "Community member",
      username: profile?.username ?? "member",
      avatar_url: profile?.avatar_url ?? null,
    };
  });
  const postIds = (postsResult.data ?? []).map((post) => post.id);
  const [repliesResult, commentsResult] = await Promise.all([
    postIds.length ? supabase.from("feed_replies").select("id, post_id, author_id, body, created_at").in("post_id", postIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from("feed_comments").select("id, post_id, author_id, body, created_at").in("post_id", postIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [], error: null }),
  ]);
  const relatedProfileIds = [...new Set([
    ...(postsResult.data ?? []).map((post) => post.author_id),
    ...(repliesResult.data ?? []).map((reply) => reply.author_id),
    ...(commentsResult.data ?? []).map((comment) => comment.author_id),
  ])];
  const authorsResult = relatedProfileIds.length
    ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", relatedProfileIds)
    : { data: [], error: null };
  const authors = new Map((authorsResult.data ?? []).map((author) => [author.id, author]));
  const getAuthor = (id: string) => {
    const author = authors.get(id);
    return { id, name: author?.name ?? "Community member", username: author?.username ?? "member", avatarUrl: author?.avatar_url ?? null };
  };
  const posts = (postsResult.data ?? []).map((post) => ({
    ...post,
    author: getAuthor(post.author_id),
    replies: (repliesResult.data ?? []).filter((reply) => reply.post_id === post.id).map((reply) => ({ ...reply, author: getAuthor(reply.author_id) })),
    comments: (commentsResult.data ?? []).filter((comment) => comment.post_id === post.id).map((comment) => ({ ...comment, author: getAuthor(comment.author_id) })),
  }));
  const currentProfile = profileResult.data
    ? { id: profileResult.data.id, name: profileResult.data.name ?? user.user_metadata?.name ?? "Community member", username: profileResult.data.username ?? "member", avatarUrl: profileResult.data.avatar_url ?? null }
    : { id: user.id, name: user.user_metadata?.name ?? "Community member", username: "member", avatarUrl: null };
  const setupRequired = [postsResult.error, repliesResult.error, commentsResult.error].some((error) => error && ["42P01", "42703"].includes(error.code ?? ""));
  const loadError = setupRequired ? "setup" : postsResult.error || repliesResult.error || commentsResult.error ? "load" : null;
  const feedPosts = setupRequired ? [] : posts;
  const initials = clan.name.trim().slice(0, 1).toUpperCase();

  return (
    <main className="sabha-design min-h-screen">
      <SabhaNavbar section="feed" />
      <div className={`${styles.page} mx-auto w-full max-w-[1180px] px-5 pb-8 pt-8 sm:px-8 sm:pt-12 lg:px-10`}>
        <section className="rounded-[18px] border border-[#e5e5ea] bg-white p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-[#f0f5fb] text-[23px] font-semibold text-[#0071e3]">
                {clan.avatar_url ? <Image src={clan.avatar_url} alt="" width={56} height={56} unoptimized referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials}
              </span>
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-medium uppercase tracking-[.12em] text-[#6e6e73]">{clan.visibility} Clan</p>
                <h1 className="mt-2 break-words text-[30px] font-semibold leading-tight tracking-[-.04em] text-[#1d1d1f] sm:text-[38px]">{clan.name}</h1>
                <p className="mt-2 max-w-[720px] whitespace-pre-wrap text-[14px] leading-6 text-[#6e6e73]">{clan.description || "A Sabha Clan for people to build and learn together."}</p>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[#6e6e73]">
                  <span className="inline-flex items-center gap-1.5"><Users size={14} /> {memberCountResult.count ?? 0} {(memberCountResult.count ?? 0) === 1 ? "member" : "members"}</span>
                  <span aria-hidden="true">·</span>
                  <span>Created by {ownerResult.data?.name ?? `@${ownerResult.data?.username ?? "member"}`}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {(clan.visibility === "public" || isMember) && <ClanJoinButton clanId={clan.id} isMember={isMember} isOwner={membershipResult.data?.role === "owner"} />}
              {isMember && <Link href={`/feed/new?type=conversation&clan=${encodeURIComponent(clan.slug)}`} className="sabha-button sabha-button-primary">New post</Link>}
            </div>
          </div>
        </section>
        {canManage && <ClanManagement clanId={clan.id} clanName={clan.name} clanDescription={clan.description ?? ""} clanVisibility={clan.visibility} clanAvatarUrl={clan.avatar_url} members={roster} currentUserId={user.id} currentRole={currentRole!} />}
        <section className="mt-2">
          <FeedExperience key={clan.id} currentProfile={currentProfile} activeView="all" canParticipate={isMember} canModerate={canModerate} initialPosts={feedPosts} loadError={loadError} />
        </section>
      </div>
    </main>
  );
}
