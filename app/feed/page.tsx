import { createClient } from "@/lib/supabase/server";
import { getPublicFeed } from "@/lib/supabase/feed";
import { getUserClans } from "@/lib/supabase/clans";

import FeedNavbar from "@/components/feed/feed-navbar";
import FeedSidebar from "@/components/feed/feed-sidebar";
import FeedStream from "@/components/feed/feed-stream";

import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/lib/supabase/notifications";

import NotificationBell from "@/components/feed/feed-navbar";

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string | string[];
    type?: string | string[];
  }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  /*
   * ?q=    search text from the navbar
   * ?type= "project" | "conversation" (navbar "Recent" dropdown)
   */

  const params = (await searchParams) ?? {};
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

  const q = (first(params.q) ?? "").trim();
  const needle = q.toLowerCase();
  const rawType = first(params.type);
  const type =
    rawType === "project" || rawType === "conversation" ? rawType : null;

  const matches = (...parts: (string | null | undefined)[]) =>
    !needle || parts.some((p) => p?.toLowerCase().includes(needle));

  const [feed, clans, notifications, unreadNotificationCount] =
    await Promise.all([
      getPublicFeed(),
      getUserClans(user.id),
      getNotifications(user.id),
      getUnreadNotificationCount(user.id),
    ]);

  /* Sidebar: names / titles only, unfiltered, most recent first */

  const sidebarProjects = feed
    .filter((item) => item.type === "project" && item.project)
    .slice(0, 5);

  const sidebarConversations = feed
    .filter((item) => item.type === "conversation" && item.conversation)
    .slice(0, 5);

  /* Main column: most recent posts, filtered by search / type */

  const posts = feed
    .filter((item) => {
      if (type && item.type !== type) return false;

      if (item.type === "project" && item.project) {
        return matches(
          item.project.title,
          item.project.description,
          item.author?.name,
          item.author?.username
        );
      }

      if (item.type === "conversation" && item.conversation) {
        return matches(
          item.conversation.content,
          item.author?.name,
          item.author?.username
        );
      }

      return false;
    })
    .slice(0, 20);

  const heading =
    type === "project"
      ? "Projects."
      : type === "conversation"
      ? "Conversations."
      : "Recents.";

  return (
    <>
      <FeedNavbar
        initialQuery={q}
        notifications={
          <NotificationBell
            userId={user.id}
            initialNotifications={notifications}
            initialUnreadCount={unreadNotificationCount}
          />
        }
      />

      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
        <div className="mx-auto max-w-[1180px] px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 lg:px-10 lg:pt-10">
          <h1 className="mb-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1d1d1f] sm:mb-8 sm:text-[56px]">
            {heading}
          </h1>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
            <main className="min-w-0">
              {(q || type) && (
                <div className="mb-4 flex items-center justify-between text-[13px] text-[#6e6e73]">
                  <span>
                    {q ? (
                      <>
                        Results for{" "}
                        <span className="text-[#1d1d1f]">“{q}”</span>
                      </>
                    ) : (
                      "Filtered"
                    )}
                  </span>

                  <a
                    href="/feed"
                    className="transition-colors hover:text-[#0066cc]"
                  >
                    Clear filters
                  </a>
                </div>
              )}

              <FeedStream posts={posts} />
            </main>

            <FeedSidebar
              clans={clans}
              projects={sidebarProjects}
              conversations={sidebarConversations}
            />
          </div>
        </div>
      </div>
    </>
  );
}