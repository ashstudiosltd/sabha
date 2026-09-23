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
      <div className="h-9 w-[92px] animate-pulse rounded-[8px] bg-[#e8e8ed]" />
    );
  }

  if (currentUserId === profileId) {
    return (
      <Link
        href="/settings/profile"
        className="inline-flex w-fit items-center justify-center rounded-[8px] border border-[#d2d2d7] bg-white px-5 py-2 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[13px] font-medium text-[#1d1d1f] transition-all duration-150 hover:bg-[#ededf0] active:scale-95"
      >
        Edit Profile
      </Link>
    );
  }

  return <ProfileFollowButton profileId={profileId} />;
}