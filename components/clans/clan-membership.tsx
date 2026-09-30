"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ClanMembershipProps = {
  clanId: string;
  clanSlug: string;
  ownerId: string;
  isMember: boolean;
  isPublic: boolean;
};

const base =
  "rounded-full px-5 py-2 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[14px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${base} bg-[#1d1d1f] text-white hover:bg-black active:scale-95`;
const secondary = `${base} border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] active:scale-95`;

export default function ClanMembership({
  clanId,
  clanSlug,
  ownerId,
  isMember,
  isPublic,
}: ClanMembershipProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkRequest() {
      if (isMember || isPublic) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("clan_join_requests")
        .select("id")
        .eq("clan_id", clanId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      setPending(!!data);
    }

    checkRequest();
  }, [clanId, isMember, isPublic, supabase]);

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  }

  async function handleJoin() {
    if (!isPublic || loading) return;

    setError(null);
    setLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      router.push(`/auth?next=/clan/${clanSlug}`);
      return;
    }

    const { error } = await supabase.from("clan_members").insert({
      clan_id: clanId,
      user_id: user.id,
      role: "member",
    });

    if (error) {
      console.error(error);
      setError("Couldn't join the clan. Please try again.");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  async function handleRequest() {
    if (isPublic || isMember || pending || loading) return;

    setError(null);
    setLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      router.push(`/auth?next=/clan/${clanSlug}`);
      return;
    }

    const { error } = await supabase.from("clan_join_requests").insert({
      clan_id: clanId,
      user_id: user.id,
      status: "pending",
    });

    if (error) {
      console.error(error);
      setError("Couldn't send your request. Please try again.");
      setLoading(false);
      return;
    }

    setPending(true);
    setLoading(false);
  }

  async function handleLeave() {
    if (!isMember || loading) return;

    const user = await getCurrentUser();

    if (!user || user.id === ownerId) return;

    setError(null);
    setLoading(true);

    const { error } = await supabase
      .from("clan_members")
      .delete()
      .eq("clan_id", clanId)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setError("Couldn't leave the clan. Please try again.");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  let button: React.ReactNode;

  if (isMember) {
    // Members (including the owner, who is blocked in handleLeave)
    button = (
      <button
        type="button"
        onClick={handleLeave}
        disabled={loading}
        className={secondary}
      >
        {loading ? "Leaving…" : "Leave clan"}
      </button>
    );
  } else if (isPublic) {
    button = (
      <button
        type="button"
        onClick={handleJoin}
        disabled={loading}
        className={primary}
      >
        {loading ? "Joining…" : "Join clan"}
      </button>
    );
  } else if (pending) {
    button = (
      <button
        type="button"
        disabled
        className={`${base} bg-[#f5f5f7] text-[#6e6e73]`}
      >
        Request pending
      </button>
    );
  } else {
    button = (
      <button
        type="button"
        onClick={handleRequest}
        disabled={loading}
        className={primary}
      >
        {loading ? "Requesting…" : "Request to join"}
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      {button}

      {error && (
        <p role="alert" className="text-[13px] text-[#d70015]">
          {error}
        </p>
      )}
    </div>
  );
}