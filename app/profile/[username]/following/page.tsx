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
    <main className="min-h-screen bg-transparent text-white">
      <div className="mx-auto max-w-[680px] px-5 pb-28 pt-20 sm:px-8">
        <div className="border-b border-white/15 pb-6">
          <Link
            href={`/profile/${profile.username}`}
            className="text-xs text-white/60 transition-colors hover:text-white"
          >
            ← Back to profile
          </Link>

          <h1 className="mt-5 font-serif text-3xl text-white">
            Following
          </h1>

          <p className="mt-1 text-sm text-white/60">
            {following.length}{" "}
            {following.length === 1
              ? "profile followed"
              : "profiles followed"}
          </p>
        </div>

        {following.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl text-white">
              Not following anyone yet
            </p>

            <p className="mt-2 text-sm text-white/60">
              Profiles followed by this user will appear here.
            </p>
          </div>
        ) : (
          <div>
            {following.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                className="flex items-center gap-4 border-b border-white/15 py-5 transition-colors hover:bg-white/5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-medium text-white">
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
                  <p className="truncate text-sm font-medium text-white">
                    {user.name}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-white/60">
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