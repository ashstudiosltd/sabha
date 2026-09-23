import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicProfile } from "@/lib/supabase/profile";
import { getFollowers, getFollowing } from "@/lib/supabase/follows";

type ConnectionTab = "followers" | "following";

interface ConnectionsPageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{
    tab?: string;
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

export default async function ConnectionsPage({
  params,
  searchParams,
}: ConnectionsPageProps) {
  const { username } = await params;
  const { tab } = await searchParams;

  const activeTab: ConnectionTab =
    tab === "following" ? "following" : "followers";

  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const [followers, following] = await Promise.all([
    getFollowers(profile.id),
    getFollowing(profile.id),
  ]);

  const users = activeTab === "followers" ? followers : following;

  const tabs: { id: ConnectionTab; label: string; count: number }[] = [
    { id: "followers", label: "Followers", count: followers.length },
    { id: "following", label: "Following", count: following.length },
  ];

  const emptyCopy =
    activeTab === "followers"
      ? {
          title: "No followers yet",
          body: "People who follow this profile will appear here.",
        }
      : {
          title: "Not following anyone yet",
          body: "Profiles followed by this user will appear here.",
        };

  return (
    <main className="min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
        <Link
          href={`/profile/${profile.username}`}
          className="text-[14px] text-[#0066cc] hover:underline"
        >
          ← Back to profile
        </Link>

        <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[40px]">
          {profile.name}
        </h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">
          @{profile.username}
        </p>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Connections"
          className="mt-6 inline-flex rounded-[12px] bg-[#e8e8ed] p-1"
        >
          {tabs.map(({ id, label, count }) => {
            const isActive = id === activeTab;

            return (
              <Link
                key={id}
                role="tab"
                aria-selected={isActive}
                href={`/profile/${profile.username}/connections?tab=${id}`}
                scroll={false}
                replace
                className={`rounded-[9px] px-4 py-2 text-[15px] font-medium transition-colors sm:px-5 ${
                  isActive
                    ? "bg-white text-[#1d1d1f] shadow-sm"
                    : "text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                {label}
                <span className="ml-1.5 text-[13px] font-normal text-[#6e6e73]">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* List */}
        <div className="mt-5 overflow-hidden rounded-[18px] bg-white">
          {users.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[20px] font-semibold text-[#1d1d1f]">
                {emptyCopy.title}
              </p>
              <p className="mt-2 text-[15px] text-[#6e6e73]">
                {emptyCopy.body}
              </p>
            </div>
          ) : (
            <ul role="tabpanel" className="divide-y divide-[#e8e8ed]">
              {users.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`/profile/${user.username}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#f5f5f7] sm:px-6"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f5f7] text-[14px] font-medium text-[#1d1d1f]">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-medium text-[#1d1d1f]">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate text-[14px] text-[#6e6e73]">
                        @{user.username}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}