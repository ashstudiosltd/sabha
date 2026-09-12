import Link from "next/link";
import { notFound } from "next/navigation";
import ProfileAction from "@/app/components/ProfileAction";
import Nav from "@/app/sabha/nav";

import { getPublicProfile } from "@/lib/supabase/profile";
import { getBlogPosts } from "@/lib/supabase/blog";
import Navbar from "@/app/sabha/nav";
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
    <>
      <Nav/>
      <main className="min-h-screen bg-transparent text-white">
        <div className="mx-auto max-w-[980px] px-5 pb-28 pt-20 sm:px-8 lg:px-10">
        {/* Profile header */}
        <section className="border-b border-white/15 pb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-2xl font-medium text-white">
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
                  <h1 className="font-serif text-3xl leading-tight text-white sm:text-4xl">
                    {profile.name}
                  </h1>

                  <p className="mt-1 text-sm text-white/60">
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
                <p className="mt-5 max-w-[620px] text-[15px] leading-relaxed text-white/80">
                  {profile.bio}
                </p>
              )}

              {/* Role + Status */}
              {(profile.role || profile.status) && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {profile.role && (
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] text-white/80 backdrop-blur-md">
                      {profile.role}
                    </span>
                  )}

                  {profile.status && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] text-white backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {profile.status}
                    </span>
                  )}
                </div>
              )}

              {/* Skills */}
              {profile.skills && (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">
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
                          className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] text-white/80"
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
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">
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
                          className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/70"
                        >
                          {interest}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Website / Location / Joined */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/60">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white"
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
              <p className="text-xl font-medium text-white">
                {profile.postsCount}
              </p>

              <p className="mt-1 text-xs text-white/60 transition-colors group-hover:text-white">
                Posts
              </p>
            </Link>

            <Link
              href={`/profile/${profile.username}/followers`}
              className="group"
            >
              <p className="text-xl font-medium text-white">
                {profile.followersCount}
              </p>

              <p className="mt-1 text-xs text-white/60 transition-colors group-hover:text-white">
                Followers
              </p>
            </Link>

            <Link
              href={`/profile/${profile.username}/following`}
              className="group"
            >
              <p className="text-xl font-medium text-white">
                {profile.followingCount}
              </p>

              <p className="mt-1 text-xs text-white/60 transition-colors group-hover:text-white">
                Following
              </p>
            </Link>

            <div>
              <p className="text-xl font-medium text-white">
                {profile.likesReceived}
              </p>

              <p className="mt-1 text-xs text-white/60">
                Likes
              </p>
            </div>
          </div>
        </section>

        {/* Posts */}
        <section className="pt-10">
          <div className="mb-7 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-white">
              Posts
            </h2>

            <span className="text-xs text-white/60">
              {posts.length}
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="border-y border-white/15 py-14 text-center">
              <p className="font-serif text-xl text-white">
                No posts yet
              </p>

              <p className="mt-2 text-sm text-white/60">
                This profile hasn't published anything yet.
              </p>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="border-b border-white/15 py-7 first:pt-0"
                >
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>{post.date}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 className="mt-2 font-serif text-xl leading-snug text-white">
                    {post.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/80">
                    {post.excerpt}
                  </p>

                  {post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-5 text-xs text-white/60">
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
    </>
  );
}
