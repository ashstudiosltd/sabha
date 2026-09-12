import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicProfile } from "@/lib/supabase/profile";
import { getFollowing } from "@/lib/supabase/follows";

interface FollowingPageProps {
  params: Promise<{
    username: string;
  }>;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function FollowingPage({
  params,
}: FollowingPageProps) {
  const { username } = await params;

  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const following = await getFollowing(profile.id);

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#1B1B18]">
      <div className="mx-auto max-w-[680px] px-5 pb-28 pt-20 sm:px-8">
        <div className="border-b border-[#E6E3DA] pb-6">
          <Link
            href={`/profile/${profile.username}`}
            className="text-xs text-[#8A8577] transition-colors hover:text-[#2F4B3C]"
          >
            ← Back to profile
          </Link>

          <h1 className="mt-5 font-serif text-3xl text-[#1B1B18]">
            Following
          </h1>

          <p className="mt-1 text-sm text-[#8A8577]">
            {following.length}{" "}
            {following.length === 1
              ? "following"
              : "following"}
          </p>
        </div>

        {following.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl text-[#1B1B18]">
              Not following anyone yet
            </p>

            <p className="mt-2 text-sm text-[#8A8577]">
              Profiles followed by this user will appear here.
            </p>
          </div>
        ) : (
          <div>
            {following.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                className="flex items-center gap-4 border-b border-[#E6E3DA] py-5 transition-colors hover:bg-[#F3F0E9]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2F4B3C] text-sm font-medium text-[#FAFAF7]">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1B1B18]">
                    {user.name}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-[#8A8577]">
                    @{user.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}