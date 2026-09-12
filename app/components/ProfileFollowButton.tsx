"use client";

import { useEffect, useState } from "react";

import {
  getFollowState,
  toggleFollow,
} from "@/lib/supabase/follows";

interface ProfileFollowButtonProps {
  profileId: string;
}

export default function ProfileFollowButton({
  profileId,
}: ProfileFollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadFollowState = async () => {
      const state = await getFollowState(profileId);

      if (!mounted) return;

      setFollowing(state.following);
      setFollowersCount(state.followersCount);
      setLoading(false);
    };

    loadFollowState();

    return () => {
      mounted = false;
    };
  }, [profileId]);

  const handleToggleFollow = async () => {
    if (updating) return;

    setUpdating(true);

    const result = await toggleFollow(profileId);

    if (result.error) {
      window.alert(result.error);
      setUpdating(false);
      return;
    }

    setFollowing(result.following);
    setFollowersCount(result.followersCount);

    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="h-9 w-[92px] animate-pulse rounded-full bg-[#E6E3DA]" />
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      disabled={updating}
      className={`w-fit rounded-full border px-5 py-2 text-[12.5px] font-medium transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        following
          ? "border-[#E6E3DA] bg-[#F3F0E9] text-[#5B5748]"
          : "border-[#1B1B18] bg-[#1B1B18] text-[#FAFAF7] hover:bg-[#2F4B3C]"
      }`}
    >
      {updating
        ? "..."
        : following
          ? "Following"
          : "Follow"}
    </button>
  );
}