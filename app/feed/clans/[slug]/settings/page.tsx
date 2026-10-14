import Link from "next/link";
import Image from "next/image";
import settingsStyles from "@/components/feed/clan-settings.module.css";
import { notFound, redirect } from "next/navigation";
import ClanManagement, { type ClanMemberSummary } from "@/components/feed/clan-management";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClanSettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ section?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/feed/clans/${slug}/settings`)}`);
  const { data: clan } = await supabase.from("clans").select("id, name, slug, description, visibility, avatar_url").eq("slug", slug).maybeSingle();
  if (!clan) notFound();
  const { data: membership } = await supabase.from("clan_members").select("role").eq("clan_id", clan.id).eq("user_id", user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) redirect(`/feed/clans/${slug}`);
  const [membersResult, invitesResult, archiveResult, requestsResult] = await Promise.all([
    supabase.from("clan_members").select("user_id, role").eq("clan_id", clan.id).order("joined_at"),
    supabase.rpc("get_clan_pending_invites", { p_clan_id: clan.id }),
    supabase.from("clans").select("archived_at").eq("id", clan.id).maybeSingle(),
    supabase.rpc("get_clan_join_requests", { p_clan_id: clan.id }),
  ]);
  const ids = (membersResult.data ?? []).map((member) => member.user_id);
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", ids) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const members: ClanMemberSummary[] = (membersResult.data ?? []).map((member) => {
    const profile = profileMap.get(member.user_id);
    return { ...member, role: member.role as ClanMemberSummary["role"], name: profile?.name ?? "Community member", username: profile?.username ?? "member", avatar_url: profile?.avatar_url ?? null };
  });
  return <main className={`sabha-design min-h-screen ${settingsStyles.page}`}>
    <SabhaNavbar section="feed" feedView="clans" showClanCreateAction={false} searchPath="/feed" />
    <div className={settingsStyles.container}>
      <header className={settingsStyles.heading}>
        <div className={settingsStyles.identity}>
          <span className={settingsStyles.avatar}>{clan.avatar_url ? <Image src={clan.avatar_url} alt="" width={48} height={48} unoptimized /> : clan.name.slice(0, 1).toUpperCase()}</span>
          <div><h1>{clan.name}</h1><p>{clan.visibility === "private" ? "Private" : "Public"} Clan · {membership.role === "owner" ? "Owner" : "Admin"}</p></div>
        </div>
        <Link href={`/feed/clans/${slug}`} className="sabha-button">View Clan</Link>
      </header>
      {membersResult.error ? <p role="alert" className="text-sm text-red-600">Members couldn’t load. Refresh before making changes.</p> : <ClanManagement key={query.section ?? "general"} clanId={clan.id} clanName={clan.name} clanDescription={clan.description ?? ""} clanVisibility={clan.visibility} clanAvatarUrl={clan.avatar_url} members={members} currentUserId={user.id} currentRole={membership.role as ClanMemberSummary["role"]} initialSection={query.section} joinRequests={requestsResult.data ?? []} requestsReady={!requestsResult.error} pendingInvites={invitesResult.data ?? []} controlsReady={!invitesResult.error && !archiveResult.error} archived={!!archiveResult.data?.archived_at} />}
    </div>
  </main>;
}
