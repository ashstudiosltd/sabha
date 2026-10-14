"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { createClient } from "@/lib/supabase/client";

export interface ClanJoinRequest { id: string; user_id: string; name: string | null; username: string | null; avatar_url: string | null; created_at: string }
export default function ClanJoinRequests({ clanId, requests, archived, ready }: { clanId: string; requests: ClanJoinRequest[]; archived: boolean; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const respond = async (id: string, accept: boolean) => {
    setBusy(id); setError(null);
    try {
      const { error: responseError } = await createClient().rpc("respond_to_clan_join_request", { p_clan_id: clanId, p_request_id: id, p_accept: accept });
      if (responseError) throw new Error(responseError.code === "P0002" ? "This request has already been answered. Refresh to see the latest requests." : "This request couldn’t be updated. Please try again.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This request couldn’t be updated."); }
    finally { setBusy(null); }
  };
  return <div>
    <p className="mt-0 text-[13px] text-[#6e6e73]">Review who can join your private Clan. Approval grants access to its posts and members.</p>
    {error && <p role="alert" className="text-[12px] text-red-600">{error}</p>}
    {!ready ? <p role="status" className="text-[13px] text-[#6e6e73]">Join requests are temporarily unavailable.</p> : !requests.length ? <p className="rounded-xl border border-[#e5e5ea] p-5 text-[13px] text-[#6e6e73]">No pending requests.</p> : <ul className="m-0 list-none divide-y divide-[#e5e5ea] rounded-xl border border-[#e5e5ea] p-0">{requests.map((request) => <li key={request.id} className="flex flex-wrap items-center gap-3 p-4">
      <ProfileAvatar name={request.name || "Community member"} avatarUrl={request.avatar_url} size="small" />
      <div className="min-w-0 flex-1"><strong className="block truncate text-[13px] font-medium">{request.name || request.username}</strong><span className="text-[12px] text-[#6e6e73]">@{request.username} · {request.created_at.slice(0, 10)}</span></div>
      <button type="button" className="sabha-button" disabled={!!busy} onClick={() => void respond(request.id, false)}>Decline</button><button type="button" className="sabha-button sabha-button-primary" disabled={!!busy || archived} onClick={() => void respond(request.id, true)}>{busy === request.id ? "Updating…" : "Approve"}</button>
    </li>)}</ul>}
    {archived && <p className="text-[12px] text-[#6e6e73]">Restore this Clan before approving requests.</p>}
  </div>;
}
