import Link from "next/link";
import { notFound } from "next/navigation";
import ProfileAction from "@/app/components/ProfileAction";

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

export default async function ProfilePage({
  params,
}: ProfilePageProps) {
  const { username } = await params;

  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const allPosts = await getBlogPosts();

  const posts = allPosts.filter(
    (post) => post.authorId === profile.id
  );

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#1B1B18]">
      <div className="mx-auto max-w-[980px] px-5 pb-28 pt-20 sm:px-8 lg:px-10">
        {/* Profile header */}
        <section className="border-b border-[#E6E3DA] pb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2F4B3C] text-2xl font-medium text-[#FAFAF7]">
              {profile.avatarUrl ? (
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

            {/* Profile information */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="font-serif text-3xl leading-tight text-[#1B1B18] sm:text-4xl">
                    {profile.name}
                  </h1>

                  <p className="mt-1 text-sm text-[#8A8577]">
                    @{profile.username}
                  </p>
                </div>

                <ProfileAction
                  profileId={profile.id}
                  username={profile.username}
                />
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="mt-5 max-w-[620px] text-[15px] leading-relaxed text-[#5B5748]">
                  {profile.bio}
                </p>
              )}

              {/* Role + Status */}
              {(profile.role || profile.status) && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {profile.role && (
                    <span className="rounded-full border border-[#E6E3DA] bg-white/50 px-3 py-1.5 text-[12px] text-[#5B5748]">
                      {profile.role}
                    </span>
                  )}

                  {profile.status && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8E2D9] bg-[#F3F7F3] px-3 py-1.5 text-[12px] text-[#2F4B3C]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2F4B3C]" />
                      {profile.status}
                    </span>
                  )}
                </div>
              )}

              {/* Skills */}
              {profile.skills && (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8577]">
                    Skills
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {profile.skills
                      .split(",")
                      .map((skill) => skill.trim())
                      .filter(Boolean)
                      .map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#F0EEE7] px-3 py-1.5 text-[12px] text-[#5B5748]"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {profile.interests && (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8577]">
                    Interests
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {profile.interests
                      .split(",")
                      .map((interest) => interest.trim())
                      .filter(Boolean)
                      .map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full border border-[#E6E3DA] px-3 py-1.5 text-[12px] text-[#6E6A5F]"
                        >
                          {interest}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Website / Location / Joined */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#8A8577]">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-[#2F4B3C]"
                  >
                    {formatWebsite(profile.website)}
                  </a>
                )}

                {profile.locationPublic && profile.location && (
                  <span>{profile.location}</span>
                )}

                <span>
                  Joined {formatJoinedDate(profile.joinedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Profile stats */}
          <div className="mt-8 flex items-center gap-8 sm:gap-10">
            <Link
              href={`/profile/${profile.username}`}
              className="group"
            >
              <p className="text-xl font-medium text-[#1B1B18]">
                {profile.postsCount}
              </p>

              <p className="mt-1 text-xs text-[#8A8577] transition-colors group-hover:text-[#2F4B3C]">
                Posts
              </p>
            </Link>

            <Link
              href={`/profile/${profile.username}/followers`}
              className="group"
            >
              <p className="text-xl font-medium text-[#1B1B18]">
                {profile.followersCount}
              </p>

              <p className="mt-1 text-xs text-[#8A8577] transition-colors group-hover:text-[#2F4B3C]">
                Followers
              </p>
            </Link>

            <Link
              href={`/profile/${profile.username}/following`}
              className="group"
            >
              <p className="text-xl font-medium text-[#1B1B18]">
                {profile.followingCount}
              </p>

              <p className="mt-1 text-xs text-[#8A8577] transition-colors group-hover:text-[#2F4B3C]">
                Following
              </p>
            </Link>

            <div>
              <p className="text-xl font-medium text-[#1B1B18]">
                {profile.likesReceived}
              </p>

              <p className="mt-1 text-xs text-[#8A8577]">
                Likes
              </p>
            </div>
          </div>
        </section>

        {/* Posts */}
        <section className="pt-10">
          <div className="mb-7 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-[#1B1B18]">
              Posts
            </h2>

            <span className="text-xs text-[#8A8577]">
              {posts.length}
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="border-y border-[#E6E3DA] py-14 text-center">
              <p className="font-serif text-xl text-[#1B1B18]">
                No posts yet
              </p>

              <p className="mt-2 text-sm text-[#8A8577]">
                This profile hasn't published anything yet.
              </p>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="border-b border-[#E6E3DA] py-7 first:pt-0"
                >
                  <div className="flex items-center gap-2 text-xs text-[#8A8577]">
                    <span>{post.date}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 className="mt-2 font-serif text-xl leading-snug text-[#1B1B18]">
                    {post.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#5B5748]">
                    {post.excerpt}
                  </p>

                  {post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#E6E3DA] px-2.5 py-1 text-[11px] text-[#6E6A5F]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-5 text-xs text-[#8A8577]">
                    <span>♥ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}