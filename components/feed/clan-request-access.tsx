"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClanRequestAccess({ clanId, pending = false, archived = false }: { clanId: string; pending?: boolean; archived?: boolean }) {
  const router = useRouter();
  const [requested, setRequested] = useState(pending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = async () => {
    setBusy(true); setError(null);
    try {
      const { error: requestError } = await createClient().rpc("request_to_join_clan", { p_clan_id: clanId, p_cancel: requested });
      if (requestError) throw new Error(requestError.code === "22023" ? requestError.message : "Your request couldn’t be saved. Please try again.");
      setRequested(!requested); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your request couldn’t be saved."); }
    finally { setBusy(false); }
  };
  return <div className="mt-6 grid justify-items-start gap-3">
    <p className="m-0 text-[13px] text-[#6e6e73]" role="status">{archived ? "This Clan is archived and is not accepting new members." : requested ? "Your request is pending. An owner or admin will review it." : "Request access to join this private Clan. Its posts and members stay private until you’re approved."}</p>
    {(!archived || requested) && <button type="button" className={requested ? "sabha-button" : "sabha-button sabha-button-primary"} disabled={busy} onClick={() => void request()}>{busy ? "Updating…" : requested ? "Cancel request" : "Request to join"}</button>}
    {error && <p className="m-0 text-[12px] text-red-600" role="alert">{error}</p>}
  </div>;
}
