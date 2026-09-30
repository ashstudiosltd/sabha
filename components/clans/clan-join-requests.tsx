"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type JoinRequest = {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  profile: {
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

type ClanJoinRequestsProps = {
  clanId: string;
  requests: JoinRequest[];
};

const cardClass =
  "rounded-[18px] bg-white p-5 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] sm:p-6";

export default function ClanJoinRequests({
  clanId,
  requests: initialRequests,
}: ClanJoinRequestsProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [requests, setRequests] = useState(initialRequests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(
    request: JoinRequest,
    action: "accept" | "reject"
  ) {
    if (loadingId) return;

    setError(null);
    setLoadingId(request.id);

    if (action === "accept") {
      const { error: memberError } = await supabase
        .from("clan_members")
        .insert({
          clan_id: clanId,
          user_id: request.user_id,
          role: "member",
        });

      if (memberError) {
        console.error(memberError);
        setError("Couldn't accept this request. Please try again.");
        setLoadingId(null);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("clan_join_requests")
      .update({
        status: action === "accept" ? "accepted" : "rejected",
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (updateError) {
      console.error(updateError);

      // If acceptance succeeded but updating the request failed,
      // refresh so the actual database state is reflected.
      setError("Something went wrong. Please try again.");
      router.refresh();
      setLoadingId(null);
      return;
    }

    setRequests((current) =>
      current.filter((item) => item.id !== request.id)
    );

    setLoadingId(null);
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <div className={cardClass}>
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
          Join requests
        </h2>

        <p className="mt-1.5 text-[15px] text-[#6e6e73]">
          No pending requests.
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
            Join requests
          </h2>

          <p className="mt-1 text-[13px] text-[#6e6e73]">
            People waiting to join this clan.
          </p>
        </div>

        <span className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[12px] font-medium text-[#6e6e73]">
          {requests.length}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-[12px] border border-[#ff3b30]/30 bg-[#ff3b30]/5 px-4 py-3 text-[14px] text-[#d70015]"
        >
          {error}
        </div>
      )}

      <ul className="divide-y divide-[#e8e8ed]">
        {requests.map((request) => {
          const profile = request.profile;
          const displayName =
            profile?.name || profile?.username || "Unknown user";
          const busy = loadingId === request.id;

          return (
            <li
              key={request.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f5f7] text-[14px] font-medium text-[#6e6e73]">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-[#1d1d1f]">
                    {displayName}
                  </p>

                  {profile?.username && (
                    <p className="truncate text-[13px] text-[#6e6e73]">
                      @{profile.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={!!loadingId}
                  onClick={() => handleRequest(request, "reject")}
                  className="rounded-[8px] border border-[#d2d2d7] px-4 py-2 text-[14px] text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-40"
                >
                  {busy ? "…" : "Reject"}
                </button>

                <button
                  type="button"
                  disabled={!!loadingId}
                  onClick={() => handleRequest(request, "accept")}
                  className="rounded-[8px] bg-[#1d1d1f] px-4 py-2 text-[14px] font-medium text-white transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "…" : "Accept"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}