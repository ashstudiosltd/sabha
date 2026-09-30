"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  profile: {
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

type ClanMembersProps = {
  clanId: string;
  ownerId: string;
  members: Member[];
  canManage: boolean;
};

export default function ClanMembers({
  clanId,
  ownerId,
  members,
  canManage,
}: ClanMembersProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateRole(member: Member, role: "admin" | "member") {
    if (!canManage || loadingId) return;
    if (member.user_id === ownerId) return;

    setError(null);
    setLoadingId(member.id);

    const { error } = await supabase
      .from("clan_members")
      .update({ role })
      .eq("id", member.id);

    if (error) {
      console.error(error);
      setError("Couldn't update the role. Please try again.");
      setLoadingId(null);
      return;
    }

    setLoadingId(null);
    router.refresh();
  }

  async function removeMember(member: Member) {
    if (!canManage || loadingId) return;
    if (member.user_id === ownerId) return;

    const confirmed = window.confirm(
      `Remove ${
        member.profile?.name || member.profile?.username || "this member"
      } from the clan?`
    );

    if (!confirmed) return;

    setError(null);
    setLoadingId(member.id);

    const { error } = await supabase
      .from("clan_members")
      .delete()
      .eq("id", member.id);

    if (error) {
      console.error(error);
      setError("Couldn't remove this member. Please try again.");
      setLoadingId(null);
      return;
    }

    setLoadingId(null);
    router.refresh();
  }

  return (
    <section className="rounded-[18px] bg-white p-5 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
            Members
          </h2>

          <p className="mt-1 text-[13px] text-[#6e6e73]">
            {members.length} {members.length === 1 ? "member" : "members"} in
            this clan.
          </p>
        </div>
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
        {members.map((member) => {
          const profile = member.profile;
          const isOwner = member.user_id === ownerId;
          const isLoading = loadingId === member.id;
          const displayName =
            profile?.name || profile?.username || "Unknown user";

          return (
            <li
              key={member.id}
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

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium capitalize ${
                    isOwner
                      ? "bg-[#1d1d1f] text-white"
                      : "bg-[#f5f5f7] text-[#6e6e73]"
                  }`}
                >
                  {member.role}
                </span>

                {canManage && !isOwner && (
                  <>
                    <select
                      value={member.role}
                      disabled={isLoading || !!loadingId}
                      aria-label={`Role for ${displayName}`}
                      onChange={(event) =>
                        updateRole(
                          member,
                          event.target.value as "admin" | "member"
                        )
                      }
                      className="rounded-[8px] border border-[#d2d2d7] bg-white px-3 py-2 text-[14px] text-[#1d1d1f] outline-none transition-colors focus:border-[#0071e3] disabled:opacity-40"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>

                    <button
                      type="button"
                      disabled={!!loadingId}
                      onClick={() => removeMember(member)}
                      className="rounded-[8px] border border-[#d2d2d7] px-4 py-2 text-[14px] text-[#d70015] transition-colors hover:bg-[#ff3b30]/5 disabled:opacity-40"
                    >
                      {isLoading ? "…" : "Remove"}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}