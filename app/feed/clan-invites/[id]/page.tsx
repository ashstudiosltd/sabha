import { notFound, redirect } from "next/navigation";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import ClanInviteResponse from "@/components/feed/clan-invite-response";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClanInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/feed/clan-invites/${id}`)}`);

  const { data, error } = await supabase.rpc("get_clan_invite_context", { p_invite_id: id });
  const invite = Array.isArray(data) ? data[0] : data;
  if (error || !invite) notFound();

  return (
    <main className="sabha-design min-h-screen">
      <SabhaNavbar section="feed" />
      <ClanInviteResponse inviteId={id} clanName={invite.clan_name} inviterName={invite.inviter_name} />
    </main>
  );
}
