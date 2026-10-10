"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function ClanJoinButton({ clanId, isMember, isOwner = false, compact = false }: { clanId: string; isMember: boolean; isOwner?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMembership = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      setBusy(false);
      return;
    }

    const result = isMember
      ? await supabase.from("clan_members").delete().eq("clan_id", clanId).eq("user_id", user.id)
      : await supabase.from("clan_members").insert({ clan_id: clanId, user_id: user.id, role: "member" });

    if (result.error) {
      setError(isMember ? "Couldn’t leave this Clan. Try again." : "Couldn’t join this Clan. Try again.");
      setBusy(false);
      return;
    }

    router.refresh();
    setBusy(false);
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" className={isMember ? "sabha-button" : "sabha-button sabha-button-primary"} onClick={() => void toggleMembership()} disabled={busy || isOwner || (compact && isMember)}>
        {busy ? "Updating…" : isOwner ? "Owner" : isMember ? (compact ? "Joined" : "Leave Clan") : "Join Clan"}
      </button>
      {error && <span className="text-[11px] text-red-600" role="alert">{error}</span>}
    </span>
  );
}
