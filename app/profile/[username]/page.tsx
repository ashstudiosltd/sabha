import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Heart,
  SquarePen,
  UserCheck,
  Users,
} from "lucide-react";

import ProfileAction from "@/app/components/ProfileAction";
import Nav from "@/app/sabha/nav";

import { getPublicProfile } from "@/lib/supabase/profile";
import { getBlogPosts } from "@/lib/supabase/blog";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

function formatJoinedDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatUserFor(date: string): string {
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / 86_400_000
  );

  if (days < 1) return "Today";
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"}`;

  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const pillClass =
  "inline-flex items-center gap-2 rounded-[8px] bg-[#f5f5f7] px-3 py-2 text-[14px] text-[#1d1d1f] sm:text-[15px]";

const gridCols =
  "md:grid-cols-[minmax(0,1fr)_76px_76px_100px_76px]";

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const allPosts = await getBlogPosts();

  const posts = allPosts.filter((post) => post.authorId === profile.id);

  const skills = profile.skills ? splitList(profile.skills) : [];
  const interests = profile.interests ? splitList(profile.interests) : [];

  /* Detail rows (label / value), like "Roles / Platforms" */
  const rows: { label: string; value: ReactNode }[] = [];

  if (profile.role) rows.push({ label: "Role", value: profile.role });
  if (skills.length > 0)
    rows.push({ label: "Skills", value: skills.join(", ") });
  if (profile.status) rows.push({ label: "Status", value: profile.status });
  if (interests.length > 0)
    rows.push({ label: "Interests", value: interests.join(", ") });
  if (profile.website) {
    rows.push({
      label: "Website",
      value: (
        <a
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0066cc] hover:underline"
        >
          {formatWebsite(profile.website)}
        </a>
      ),
    });
  }

  const collapsible = rows.length > 2;

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#1d1d1f]">
        <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-10">
          {/* ───────── Profile card ───────── */}
          <section className="relative rounded-[18px] bg-white p-6 sm:p-10 lg:p-12">
            {/* Settings / follow action (top right) */}
            <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
              <ProfileAction
                profileId={profile.id}
                username={profile.username}
              />
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:gap-8 lg:gap-12">
              {/* Avatar */}
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f5f7] text-[28px] font-medium text-[#1d1d1f] sm:h-[112px] sm:w-[112px] lg:h-[128px] lg:w-[128px]">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  getInitials(profile.name)
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 sm:pr-10">
                <h1 className="break-words text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f] sm:pt-2 sm:text-[34px]">
                  {profile.name}
                </h1>

                <p className="mt-0.5 text-[15px] text-[#6e6e73]">
                  @{profile.username}
                </p>

                {/* Stat pills */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/profile/${profile.username}`}
                    className={`${pillClass} transition-colors hover:bg-[#e8e8ed]`}
                  >
                    <SquarePen
                      className="h-[18px] w-[18px] text-[#0071e3]"
                      strokeWidth={2}
                    />
                    {profile.postsCount}{" "}
                    {profile.postsCount === 1 ? "Post" : "Posts"}
                  </Link>

                  <Link
                    href={`/profile/${profile.username}/connections?tab=followers`}
                    className={`${pillClass} transition-colors hover:bg-[#e8e8ed]`}
                  >
                    <Users
                      className="h-[18px] w-[18px] text-[#5e5ce6]"
                      strokeWidth={2}
                    />
                    {profile.followersCount}{" "}
                    {profile.followersCount === 1 ? "Follower" : "Followers"}
                  </Link>

                  <Link
                    href={`/profile/${profile.username}/connections?tab=following`}
                    className={`${pillClass} transition-colors hover:bg-[#e8e8ed]`}
                  >
                    <UserCheck
                      className="h-[18px] w-[18px] text-[#2e9d3f]"
                      strokeWidth={2}
                    />
                    {profile.followingCount} Following
                  </Link>

                  <span className={pillClass}>
                    <Heart
                      className="h-[18px] w-[18px] text-[#f56300]"
                      strokeWidth={2}
                      fill="currentColor"
                    />
                    {profile.likesReceived}{" "}
                    {profile.likesReceived === 1 ? "Like" : "Likes"}
                  </span>
                </div>

                {/* Joined / User for / From */}
                <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[14px] sm:text-[15px]">
                  <div>
                    <dt className="text-[#6e6e73]">Joined</dt>
                    <dd className="font-medium text-[#1d1d1f]">
                      {formatJoinedDate(profile.joinedAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[#6e6e73]">User for</dt>
                    <dd className="font-medium text-[#1d1d1f]">
                      {formatUserFor(profile.joinedAt)}
                    </dd>
                  </div>

                  {profile.locationPublic && profile.location && (
                    <div>
                      <dt className="text-[#6e6e73]">From</dt>
                      <dd className="font-medium text-[#1d1d1f]">
                        {profile.location}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Bio */}
                {profile.bio && (
                  <p className="mt-5 max-w-[680px] text-[15px] leading-relaxed text-[#424245]">
                    {profile.bio}
                  </p>
                )}

                {/* Details + Show More */}
                {rows.length > 0 && (
                  <div className="mt-6 border-t border-[#e8e8ed] pt-6">
                    {collapsible && (
                      <input
                        id="profile-details-toggle"
                        type="checkbox"
                        aria-label="Show more profile details"
                        className="peer sr-only"
                      />
                    )}

                    <dl
                      className={`flex flex-col gap-3 text-[15px] sm:text-[16px] ${
                        collapsible
                          ? "max-h-[64px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_30%,transparent)] [mask-image:linear-gradient(to_bottom,#000_30%,transparent)] peer-checked:max-h-none peer-checked:[-webkit-mask-image:none] peer-checked:[mask-image:none]"
                          : ""
                      }`}
                    >
                      {rows.map((row) => (
                        <div
                          key={row.label}
                          className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 sm:grid-cols-[200px_minmax(0,1fr)]"
                        >
                          <dt className="text-[#6e6e73]">{row.label}</dt>
                          <dd className="break-words text-[#1d1d1f]">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {collapsible && (
                      <>
                        <label
                          htmlFor="profile-details-toggle"
                          className="mt-4 inline-flex cursor-pointer items-center gap-1 text-[16px] text-[#0066cc] hover:underline peer-checked:hidden"
                        >
                          Show More
                          <ChevronDown className="h-[18px] w-[18px]" />
                        </label>

                        <label
                          htmlFor="profile-details-toggle"
                          className="mt-4 hidden cursor-pointer items-center gap-1 text-[16px] text-[#0066cc] hover:underline peer-checked:inline-flex"
                        >
                          Show Less
                          <ChevronUp className="h-[18px] w-[18px]" />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ───────── Tabs ───────── */}
          <div className="mt-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto sm:gap-2">
              <span
                aria-current="page"
                className="shrink-0 rounded-[10px] bg-[#e8e8ed] px-3.5 py-2.5 text-[15px] font-semibold text-[#1d1d1f] sm:px-4 sm:text-[16px]"
              >
                All Posts
              </span>

              {["Replies", "Comments", "Watching"].map((label) => (
                <span
                  key={label}
                  aria-disabled="true"
                  className="shrink-0 cursor-default px-3 py-2.5 text-[15px] font-medium text-[#6e6e73] sm:px-4 sm:text-[16px]"
                >
                  {label}
                </span>
              ))}
            </div>

            <span className="hidden shrink-0 items-center gap-1.5 rounded-[10px] bg-[#e8e8ed] px-3.5 py-2.5 text-[15px] font-medium text-[#1d1d1f] sm:inline-flex sm:text-[16px]">
              Activity
              <ArrowDown className="h-[17px] w-[17px]" />
            </span>
          </div>

          {/* ───────── Posts table ───────── */}
          <section className="mt-5 overflow-hidden rounded-[18px] bg-white">
            {posts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[20px] font-semibold text-[#1d1d1f]">
                  No posts yet
                </p>
                <p className="mt-2 text-[15px] text-[#6e6e73]">
                  This profile hasn&apos;t published anything yet.
                </p>
              </div>
            ) : (
              <>
                {/* Column header (desktop) */}
                <div
                  className={`hidden gap-4 border-b border-[#e8e8ed] px-8 py-6 text-[13px] font-medium uppercase tracking-[0.04em] text-[#6e6e73] md:grid ${gridCols}`}
                >
                  <span>Post</span>
                  <span className="text-center">Replies</span>
                  <span className="text-center">Likes</span>
                  <span className="text-center">Read</span>
                  <span className="text-center">Date</span>
                </div>

                <ul className="divide-y divide-[#e8e8ed]">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <article
                        className={`relative grid grid-cols-1 gap-2 px-6 py-6 transition-colors hover:bg-[#fafafc] md:items-start md:gap-4 md:px-8 ${gridCols}`}
                      >
                        {/* Title + excerpt + tags */}
                        <div className="min-w-0">
                          <h3 className="min-w-0">
                            {/* Stretched link: the whole row is clickable */}
                            <Link
                              href={`/blogs/${post.id}`}
                              className="block truncate text-[17px] font-medium text-[#1d1d1f] after:absolute after:inset-0 hover:text-[#0066cc] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#0071e3]"
                            >
                              {post.title}
                            </Link>
                          </h3>

                          <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-[#6e6e73] sm:text-[15px]">
                            {post.excerpt}
                          </p>

                          {post.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {post.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-[3px] border-l-2 border-[#7fd1c4] bg-[#dff3ef] px-2 py-1 text-[12px] leading-none text-[#1d6b5e]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Mobile meta */}
                          <p className="mt-3 text-[13px] text-[#6e6e73] md:hidden">
                            {post.comments}{" "}
                            {post.comments === 1 ? "reply" : "replies"} ·{" "}
                            {post.likes}{" "}
                            {post.likes === 1 ? "like" : "likes"} ·{" "}
                            {post.readTime} · {post.date}
                          </p>
                        </div>

                        {/* Desktop columns */}
                        <span className="hidden text-center text-[16px] text-[#424245] md:block">
                          {post.comments}
                        </span>
                        <span className="hidden text-center text-[16px] text-[#424245] md:block">
                          {post.likes}
                        </span>
                        <span className="hidden text-center text-[14px] text-[#424245] md:block">
                          {post.readTime}
                        </span>
                        <span className="hidden text-center text-[14px] text-[#424245] md:block">
                          {post.date}
                        </span>
                      </article>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}