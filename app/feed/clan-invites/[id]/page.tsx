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

  const { data: invitation, error: invitationError } = await supabase
    .from("clan_invites")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (invitationError || !invitation) notFound();

  let invite: { clan_name: string; inviter_name: string } | null = null;
  if (invitation.status === "pending") {
    const { data } = await supabase.rpc("get_clan_invite_context", { p_invite_id: id });
    const context = Array.isArray(data) ? data[0] : data;
    if (context) invite = { clan_name: context.clan_name, inviter_name: context.inviter_name };
  }

  return (
    <main className="sabha-design min-h-screen">
      <SabhaNavbar section="feed" />
      <ClanInviteResponse
        inviteId={id}
        clanName={invite?.clan_name}
        inviterName={invite?.inviter_name}
        initialStatus={invitation.status === "pending" && !invite ? "unavailable" : invitation.status}
      />
    </main>
  );
}
