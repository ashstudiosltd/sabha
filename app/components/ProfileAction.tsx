"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import ProfileFollowButton from "@/app/components/ProfileFollowButton";

interface ProfileActionProps {
  profileId: string;
  username: string;
}

export default function ProfileAction({
  profileId,
  username,
}: ProfileActionProps) {
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setCurrentUserId(user?.id ?? null);
      setLoading(false);
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="h-9 w-[92px] animate-pulse rounded-full bg-white/10 backdrop-blur-md" />
    );
  }

  if (currentUserId === profileId) {
    return (
      <Link
        href="/settings/profile"
        className="inline-flex w-fit items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-[12.5px] font-medium text-white backdrop-blur-md transition-all duration-150 hover:bg-white/20 active:scale-95"
      >
        Edit Profile
      </Link>
    );
  }

  return <ProfileFollowButton profileId={profileId} />;
}