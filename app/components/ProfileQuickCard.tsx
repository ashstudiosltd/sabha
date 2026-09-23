"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getPublicProfile,
  type PublicProfile,
} from "@/lib/supabase/profile";

import ProfileAction from "@/app/components/ProfileAction";

interface ProfileQuickCardProps {
  username: string;
  onClose?: () => void;
}

export default function ProfileQuickCard({
  username,
  onClose,
}: ProfileQuickCardProps) {
  const [profile, setProfile] =
    useState<PublicProfile | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);

      const data = await getPublicProfile(username);

      if (!mounted) return;

      setProfile(data);
      setLoading(false);
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-[18px] border border-[#d2d2d7] border-l-[8px] border-l-[#4a8fe7] bg-white p-4 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-[#e8e8ed]" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-32 animate-pulse rounded bg-[#e8e8ed]" />
            <div className="h-3 w-24 animate-pulse rounded bg-[#e8e8ed]" />
          </div>
        </div>

        <div className="mt-4 h-3 w-full animate-pulse rounded bg-[#e8e8ed]" />
        <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[#e8e8ed]" />

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          <div className="h-12 animate-pulse rounded-[12px] bg-[#e8e8ed]" />
          <div className="h-12 animate-pulse rounded-[12px] bg-[#e8e8ed]" />
          <div className="h-12 animate-pulse rounded-[12px] bg-[#e8e8ed]" />
          <div className="h-12 animate-pulse rounded-[12px] bg-[#e8e8ed]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full overflow-hidden rounded-[18px] border border-[#d2d2d7] border-l-[8px] border-l-[#4a8fe7] bg-white p-4 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <p className="text-[13px] text-[#d70015]">
          Unable to load this profile.
        </p>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const skills = profile.skills
    ? profile.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="w-full overflow-hidden rounded-[18px] border border-[#d2d2d7] border-l-[8px] border-l-[#4a8fe7] bg-white p-4 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Header */}

      <div className="flex items-start gap-3">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="h-12 w-12 shrink-0 rounded-full border border-[#d2d2d7] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8e8ed] text-[12px] font-medium text-[#1d1d1f]">
            {initials || "U"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${profile.username}`}
            onClick={onClose}
            className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f] transition-colors hover:text-[#0066cc]"
          >
            {profile.name}
          </Link>

          <Link
            href={`/profile/${profile.username}`}
            onClick={onClose}
            className="block truncate text-[12px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
          >
            @{profile.username}
          </Link>

          {/* Role / Status */}
          {(profile.role || profile.status) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {profile.role && (
                <span className="truncate text-[12px] text-[#6e6e73]">
                  {profile.role}
                </span>
              )}

              {profile.role && profile.status && (
                <span className="text-[10px] text-[#86868b]">
                  ·
                </span>
              )}

              {profile.status && (
                <span className="inline-flex max-w-[120px] items-center gap-1 truncate text-[12px] text-[#1d1d1f]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2e8b2e]" />
                  <span className="truncate">
                    {profile.status}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="shrink-0 rounded-full px-2 py-1 text-[12px] text-[#6e6e73] transition-colors hover:bg-black/5 hover:text-[#1d1d1f]"
          >
            Close
          </button>
        )}
      </div>

      {/* Bio */}

      {profile.bio && (
        <p className="mt-3 line-clamp-3 text-[13px] leading-5 text-[#6e6e73]">
          {profile.bio}
        </p>
      )}

      {/* Skills */}

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-[4px] bg-[#fbe5d3] px-2.5 py-1 text-[11px] font-medium text-[#b5470f]"
            >
              {skill}
            </span>
          ))}

          {skills.length > 4 && (
            <span className="rounded-[4px] bg-[#e8e8ed] px-2.5 py-1 text-[11px] font-medium text-[#6e6e73]">
              +{skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Stats */}

      <div className="mt-4 grid grid-cols-4 gap-1.5">
        <div className="rounded-[12px] bg-[#f5f5f7] px-2 py-2 text-center">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">
            {profile.postsCount}
          </p>

          <p className="mt-0.5 text-[11px] text-[#6e6e73]">
            Posts
          </p>
        </div>

        <div className="rounded-[12px] bg-[#f5f5f7] px-2 py-2 text-center">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">
            {profile.followersCount}
          </p>

          <p className="mt-0.5 text-[11px] text-[#6e6e73]">
            Followers
          </p>
        </div>

        <div className="rounded-[12px] bg-[#f5f5f7] px-2 py-2 text-center">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">
            {profile.followingCount}
          </p>

          <p className="mt-0.5 text-[11px] text-[#6e6e73]">
            Following
          </p>
        </div>

        <div className="rounded-[12px] bg-[#f5f5f7] px-2 py-2 text-center">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">
            {profile.likesReceived}
          </p>

          <p className="mt-0.5 text-[11px] text-[#6e6e73]">
            Likes
          </p>
        </div>
      </div>

      {/* Actions */}

      <div className="mt-4 flex items-center gap-2">
        <ProfileAction
          profileId={profile.id}
          username={profile.username}
        />

        <Link
          href={`/profile/${profile.username}`}
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center rounded-[8px] border border-[#d2d2d7] bg-white px-4 py-2 text-[13px] font-medium text-[#1d1d1f] transition-all duration-150 hover:border-[#1d1d1f] hover:bg-[#1d1d1f] hover:text-white active:scale-95"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}