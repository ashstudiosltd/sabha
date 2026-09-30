import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  getClanBySlug,
  getClanMembers,
  getClanJoinRequests,
} from "@/lib/supabase/clans";
import { getClanFeed } from "@/lib/supabase/feed";
import FeedActions from "@/components/feed/feed-actions";
import ProjectAttachments from "@/components/feed/project-attachments";
import ClanMembership from "@/components/clans/clan-membership";
import ClanJoinRequests from "@/components/clans/clan-join-requests";
import ClanMembers from "@/components/clans/clan-members";

type ClanPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const pageClass =
  "min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]";

export default async function ClanPage({ params }: ClanPageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const clan = await getClanBySlug(slug);

  if (!clan) {
    return (
      <main className={pageClass}>
        <div className="mx-auto w-full max-w-[760px] px-4 py-16 sm:px-8">
          <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            Clan not found.
          </h1>

          <p className="mt-2 text-[15px] text-[#6e6e73]">
            This clan may not exist or you may not have access to it.
          </p>

          <Link
            href="/clans"
            className="mt-6 inline-block text-[14px] text-[#0066cc] hover:underline"
          >
            ← Back to clans
          </Link>
        </div>
      </main>
    );
  }

  const { data: membership } = user
    ? await supabase
        .from("clan_members")
        .select("id")
        .eq("clan_id", clan.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const isMember = !!membership;

  const members = await getClanMembers(clan.id);
  const feed = await getClanFeed(clan.id);

  const isOwner = user?.id === clan.owner_id;

  const joinRequests = isOwner ? await getClanJoinRequests(clan.id) : [];

  const requestUserIds = joinRequests.map((request) => request.user_id);

  const { data: requestProfiles } =
    requestUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, name, avatar_url")
          .in("id", requestUserIds)
      : { data: [] };

  const requestsWithProfiles = joinRequests.map((request) => ({
    ...request,
    profile:
      requestProfiles?.find((profile) => profile.id === request.user_id) ??
      null,
  }));

  const memberUserIds = members.map((member) => member.user_id);

  const { data: memberProfiles } =
    memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, name, avatar_url")
          .in("id", memberUserIds)
      : { data: [] };

  const membersWithProfiles = members.map((member) => ({
    ...member,
    profile:
      memberProfiles?.find((profile) => profile.id === member.user_id) ??
      null,
  }));

  return (
    <main className={pageClass}>
      <div className="mx-auto w-full max-w-[820px] px-4 py-8 sm:px-8 sm:py-12">
        <Link
          href="/clan"
          className="text-[14px] text-[#0066cc] hover:underline"
        >
          ← Back to clans
        </Link>

        {/* Clan Header */}
        <section className="mt-4 overflow-hidden rounded-[18px] bg-white">
          <div className="relative h-36 bg-gradient-to-br from-[#e8e8ed] via-[#f0f0f3] to-[#f5f5f7] sm:h-44">
            {clan.banner_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clan.banner_url}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="-mt-14 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border-4 border-white bg-[#f5f5f7] text-[28px] font-semibold text-[#1d1d1f]">
                  {clan.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clan.avatar_url}
                      alt={clan.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    clan.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-[26px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[30px]">
                    {clan.name}
                  </h1>

                  <p className="mt-0.5 text-[14px] text-[#6e6e73]">
                    /clan/{clan.slug}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ClanMembership
                  clanId={clan.id}
                  clanSlug={clan.slug}
                  ownerId={clan.owner_id}
                  isMember={isMember}
                  isPublic={clan.visibility === "public"}
                />

                {isOwner && (
                  <Link
                    href={`/clan/${clan.slug}/settings`}
                    className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2 text-[14px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                  >
                    Settings
                  </Link>
                )}
              </div>
            </div>

            {clan.description && (
              <p className="mt-6 max-w-2xl whitespace-pre-wrap text-[15px] leading-6 text-[#1d1d1f]/80">
                {clan.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[13px] text-[#6e6e73]">
                {members.length}{" "}
                {members.length === 1 ? "member" : "members"}
              </span>

              <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[13px] text-[#6e6e73]">
                {clan.visibility === "public"
                  ? "Public clan"
                  : "Private clan"}
              </span>
            </div>
          </div>
        </section>

        {/* Members */}
        <section className="mt-6">
          <ClanMembers
            clanId={clan.id}
            ownerId={clan.owner_id}
            members={membersWithProfiles}
            canManage={isOwner}
          />
        </section>

        {/* Feed */}
        <section className="mt-6 space-y-4">
          {feed.length === 0 ? (
            <div className="rounded-[18px] bg-white px-6 py-14 text-center">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                Nothing here yet.
              </h2>

              <p className="mt-2 text-[15px] text-[#6e6e73]">
                {isMember
                  ? "Be the first to share something with this clan."
                  : "Join the clan to start participating."}
              </p>
            </div>
          ) : (
            feed.map((item) => {
              const author = item.author;

              return (
                <article
                  key={item.id}
                  className="rounded-[18px] bg-white p-5 sm:p-6"
                >
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f5f7] text-[14px] font-medium text-[#6e6e73]">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={author.avatar_url}
                          alt={author.name ?? author.username ?? ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (author?.name || author?.username || "?")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-[#1d1d1f]">
                        {author?.name || author?.username || "Unknown"}
                      </p>

                      <p className="truncate text-[13px] text-[#6e6e73]">
                        @{author?.username || "unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Conversation */}
                  {item.type === "conversation" && item.conversation && (
                    <p className="mt-4 whitespace-pre-wrap text-[16px] leading-7 text-[#1d1d1f]">
                      {item.conversation.content}
                    </p>
                  )}

                  {/* Project */}
                  {item.type === "project" && item.project && (
                    <div className="mt-4">
                      <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                        {item.project.title}
                      </h2>

                      {item.project.description && (
                        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6 text-[#6e6e73]">
                          {item.project.description}
                        </p>
                      )}

                      {item.project.project_url && (
                        <a
                          href={item.project.project_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex rounded-full border border-[#d2d2d7] px-4 py-2 text-[14px] text-[#0066cc] transition-colors hover:bg-[#f5f5f7]"
                        >
                          View project ↗
                        </a>
                      )}

                      <ProjectAttachments attachments={item.attachments} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 border-t border-[#e8e8ed] pt-4">
                    <FeedActions
                      feedItemId={item.id}
                      initialLikes={item.likesCount}
                      initialComments={item.commentsCount}
                      initialLiked={item.likedByCurrentUser}
                    />
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}