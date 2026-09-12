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
      <div className="w-full rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-[#E6E3DA]" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-32 animate-pulse rounded bg-[#E6E3DA]" />
            <div className="h-3 w-24 animate-pulse rounded bg-[#E6E3DA]" />
          </div>
        </div>

        <div className="mt-4 h-3 w-full animate-pulse rounded bg-[#E6E3DA]" />
        <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[#E6E3DA]" />

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          <div className="h-12 animate-pulse rounded-xl bg-[#E6E3DA]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#E6E3DA]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#E6E3DA]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#E6E3DA]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] p-4 shadow-xl">
        <p className="text-[13px] text-[#7A2E2E]">
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
      className="w-full rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] p-4 shadow-xl"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Header */}

      <div className="flex items-start gap-3">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="h-12 w-12 shrink-0 rounded-full border border-[#E6E3DA] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2F4B3C] text-[12px] font-medium text-[#FAFAF7]">
            {initials || "U"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${profile.username}`}
            onClick={onClose}
            className="block truncate text-[14px] font-medium text-[#1B1B18] transition-colors hover:text-[#2F4B3C]"
          >
            {profile.name}
          </Link>

          <Link
            href={`/profile/${profile.username}`}
            onClick={onClose}
            className="block truncate text-[12px] text-[#8A8577] transition-colors hover:text-[#2F4B3C]"
          >
            @{profile.username}
          </Link>

          {/* Role / Status */}
          {(profile.role || profile.status) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {profile.role && (
                <span className="truncate text-[11px] text-[#6E6A5F]">
                  {profile.role}
                </span>
              )}

              {profile.role && profile.status && (
                <span className="text-[10px] text-[#B0ACA1]">
                  ·
                </span>
              )}

              {profile.status && (
                <span className="inline-flex max-w-[120px] items-center gap-1 truncate text-[11px] text-[#2F4B3C]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F4B3C]" />
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
            className="shrink-0 rounded-full px-2 py-1 text-[11px] text-[#8A8577] transition-colors hover:bg-[#F2F1EA] hover:text-[#1B1B18]"
          >
            Close
          </button>
        )}
      </div>

      {/* Bio */}

      {profile.bio && (
        <p className="mt-3 line-clamp-3 text-[13px] leading-5 text-[#5B5748]">
          {profile.bio}
        </p>
      )}

      {/* Skills */}

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-[#F0EEE7] px-2.5 py-1 text-[10.5px] text-[#6E6A5F]"
            >
              {skill}
            </span>
          ))}

          {skills.length > 4 && (
            <span className="rounded-full border border-[#E6E3DA] px-2.5 py-1 text-[10.5px] text-[#8A8577]">
              +{skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Stats */}

      <div className="mt-4 grid grid-cols-4 gap-1.5">
        <div className="rounded-xl border border-[#E6E3DA] px-2 py-2 text-center">
          <p className="text-[13px] font-medium text-[#1B1B18]">
            {profile.postsCount}
          </p>

          <p className="mt-0.5 text-[10px] text-[#8A8577]">
            Posts
          </p>
        </div>

        <div className="rounded-xl border border-[#E6E3DA] px-2 py-2 text-center">
          <p className="text-[13px] font-medium text-[#1B1B18]">
            {profile.followersCount}
          </p>

          <p className="mt-0.5 text-[10px] text-[#8A8577]">
            Followers
          </p>
        </div>

        <div className="rounded-xl border border-[#E6E3DA] px-2 py-2 text-center">
          <p className="text-[13px] font-medium text-[#1B1B18]">
            {profile.followingCount}
          </p>

          <p className="mt-0.5 text-[10px] text-[#8A8577]">
            Following
          </p>
        </div>

        <div className="rounded-xl border border-[#E6E3DA] px-2 py-2 text-center">
          <p className="text-[13px] font-medium text-[#1B1B18]">
            {profile.likesReceived}
          </p>

          <p className="mt-0.5 text-[10px] text-[#8A8577]">
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
          className="inline-flex flex-1 items-center justify-center rounded-full border border-[#E6E3DA] px-4 py-2 text-[12px] font-medium text-[#1B1B18] transition-all duration-150 hover:border-[#1B1B18] hover:bg-[#1B1B18] hover:text-[#FAFAF7] active:scale-95"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}