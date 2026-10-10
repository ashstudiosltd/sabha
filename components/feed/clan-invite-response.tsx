"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClanInviteResponse({ inviteId, clanName, inviterName }: { inviteId: string; clanName: string; inviterName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: slug, error: responseError } = await supabase.rpc("respond_to_clan_invite", { p_invite_id: inviteId, p_accept: accept });
    if (responseError || typeof slug !== "string") {
      setError("This invitation is no longer available. Ask a Clan admin for a new one.");
      setBusy(false);
      router.refresh();
      return;
    }
    router.replace(accept ? `/feed/clans/${slug}` : "/feed?view=clans");
    router.refresh();
  };

  return (
    <div className="mx-auto grid min-h-[55vh] w-full max-w-[620px] content-center px-5 py-12">
      <section className="rounded-[20px] border border-[#e5e5ea] bg-white p-7 sm:p-10">
        <p className="m-0 text-[11px] font-medium uppercase tracking-[.13em] text-[#6e6e73]">Private Clan invitation</p>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-.04em] text-[#1d1d1f]">Join {clanName}</h1>
        <p className="mt-2 text-[13px] text-[#6e6e73]">Invited by {inviterName}</p>
        <p className="mt-3 text-[14px] leading-6 text-[#6e6e73]">Members can read and post in this private space. Its posts and roster are hidden from people who haven’t joined.</p>
        {error && <p className="mt-4 text-[13px] text-red-600" role="alert">{error}</p>}
        <div className="mt-7 flex flex-wrap gap-2">
          <button type="button" className="sabha-button sabha-button-primary" disabled={busy} onClick={() => void respond(true)}>{busy ? "Working…" : "Accept invitation"}</button>
          <button type="button" className="sabha-button" disabled={busy} onClick={() => void respond(false)}>Decline</button>
        </div>
      </section>
    </div>
  );
}
