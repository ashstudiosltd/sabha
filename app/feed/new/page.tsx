import { redirect } from "next/navigation";

import FeedPostForm from "@/components/feed/feed-post-form";
import { createClient } from "@/lib/supabase/server";

interface FeedNewPageProps {
  searchParams: Promise<{ type?: string | string[]; clan?: string | string[] }>;
}

export const dynamic = "force-dynamic";

export default async function FeedNewPage({ searchParams }: FeedNewPageProps) {
  const params = await searchParams;
  const requestedType = Array.isArray(params.type) ? params.type[0] : params.type;
  const requestedClan = Array.isArray(params.clan) ? params.clan[0] : params.clan;
  const postType = requestedType === "project" || requestedType === "project-up" ? "project" : "conversation";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth?next=%2Ffeed%2Fnew");

  let clan: { id: string; slug: string; name: string } | null = null;
  if (requestedClan) {
    const { data: foundClan } = await supabase.from("clans").select("id, slug, name").eq("slug", requestedClan).maybeSingle();
    if (!foundClan) redirect("/feed?view=clans");
    const { data: membership } = await supabase.from("clan_members").select("clan_id").eq("clan_id", foundClan.id).eq("user_id", user.id).maybeSingle();
    if (!membership) redirect(`/feed/clans/${foundClan.slug}`);
    const { data: archiveState } = await supabase.from("clans").select("archived_at").eq("id", foundClan.id).maybeSingle();
    if (archiveState?.archived_at) redirect(`/feed/clans/${foundClan.slug}`);
    clan = foundClan;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="sabha-design min-h-screen">
      <FeedPostForm
        authorId={user.id}
        authorName={profile?.name ?? user.user_metadata?.name ?? "Community member"}
        authorUsername={profile?.username ?? "member"}
        postType={postType}
        clanId={clan?.id}
        clanSlug={clan?.slug}
        clanName={clan?.name}
      />
    </main>
  );
}
