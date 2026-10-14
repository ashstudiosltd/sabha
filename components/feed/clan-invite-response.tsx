"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type InviteStatus = "pending" | "accepted" | "declined" | "unavailable";

export default function ClanInviteResponse({ inviteId, clanName, inviterName, initialStatus = "pending" }: { inviteId: string; clanName?: string; inviterName?: string; initialStatus?: InviteStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<InviteStatus>(initialStatus);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: slug, error: responseError } = await supabase.rpc("respond_to_clan_invite", { p_invite_id: inviteId, p_accept: accept });
    if (responseError) {
      if (responseError.code === "P0002") {
        setStatus("unavailable");
        setError(null);
      } else {
        setError("Your response couldn’t be saved. Check your connection and try again.");
      }
      setBusy(false);
      return;
    }
    if (typeof slug !== "string") {
      setError("Your response couldn’t be confirmed. Refresh this page and try again.");
      setBusy(false);
      return;
    }
    if (accept) {
      setStatus("accepted");
      router.replace(`/feed/clans/${slug}`);
    } else {
      setStatus("declined");
      router.replace("/feed?view=clans");
    }
    router.refresh();
  };

  if (status !== "pending") {
    const statusText = status === "accepted"
      ? "You’ve joined this Clan."
      : status === "declined"
        ? "You declined this invitation."
        : "This invitation is no longer available. It may have already been answered or withdrawn.";
    return (
      <div className="mx-auto grid min-h-[55vh] w-full max-w-[620px] content-center px-5 py-12">
        <section className="rounded-[20px] border border-[#e5e5ea] bg-white p-7 sm:p-10">
          <p className="m-0 text-[11px] font-medium uppercase tracking-[.13em] text-[#6e6e73]">Clan invitation</p>
          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-.04em] text-[#1d1d1f]">{status === "unavailable" ? "This link has already been used" : "Invitation updated"}</h1>
          <p className="mt-3 text-[14px] leading-6 text-[#6e6e73]">{statusText}</p>
          <Link href="/feed?view=clans" className="sabha-button sabha-button-primary mt-6">Explore Clans</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[55vh] w-full max-w-[620px] content-center px-5 py-12">
      <section className="rounded-[20px] border border-[#e5e5ea] bg-white p-7 sm:p-10">
        <p className="m-0 text-[11px] font-medium uppercase tracking-[.13em] text-[#6e6e73]">Clan invitation</p>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-.04em] text-[#1d1d1f]">Join {clanName}</h1>
        <p className="mt-2 text-[13px] text-[#6e6e73]">Invited by {inviterName}</p>
        <p className="mt-3 text-[14px] leading-6 text-[#6e6e73]">Accept to join the Clan and see its conversations, project updates, and members.</p>
        {error && <p className="mt-4 text-[13px] text-red-600" role="alert">{error}</p>}
        <div className="mt-7 flex flex-wrap gap-2">
          <button type="button" className="sabha-button sabha-button-primary" disabled={busy} onClick={() => void respond(true)}>{busy ? "Working…" : "Accept invitation"}</button>
          <button type="button" className="sabha-button" disabled={busy} onClick={() => void respond(false)}>Decline</button>
        </div>
      </section>
    </div>
  );
}
