"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function ClanJoinButton({ clanId, isMember, isOwner = false, compact = false }: { clanId: string; isMember: boolean; isOwner?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleMembership = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError("Your sign-in couldn’t be checked. Refresh and try again.");
      setBusy(false);
      return;
    }
    if (!user) {
      router.push(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      setBusy(false);
      return;
    }

    const result = isMember
      ? await supabase.from("clan_members").delete().eq("clan_id", clanId).eq("user_id", user.id)
      : await supabase.from("clan_members").insert({ clan_id: clanId, user_id: user.id, role: "member" });

    if (result.error) {
      if (!isMember && result.error.code === "23505") {
        setNotice("You’re already a member of this Clan.");
        router.refresh();
      } else {
        setError(isMember ? "Couldn’t leave this Clan. Try again." : "Couldn’t join this Clan. Try again.");
      }
      setBusy(false);
      return;
    }

    setNotice(isMember ? "You left this Clan." : "You joined this Clan.");
    router.refresh();
    setBusy(false);
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" className={isMember ? "sabha-button" : "sabha-button sabha-button-primary"} onClick={() => void toggleMembership()} disabled={busy || isOwner || (compact && isMember)}>
        {busy ? "Updating…" : isOwner ? "Owner" : isMember ? (compact ? "Joined" : "Leave Clan") : "Join Clan"}
      </button>
      {error && <span className="max-w-48 text-right text-[11px] text-red-600" role="alert">{error}</span>}
      {notice && <span className="max-w-48 text-right text-[11px] text-[#277143]" role="status">{notice}</span>}
    </span>
  );
}
