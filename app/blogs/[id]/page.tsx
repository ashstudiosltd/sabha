import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getBlogPostByIdServer,
} from "@/lib/supabase/blog-server";

import Nav from "../../sabha/nav";
import Footer from "../../sabha/footer";

interface BlogPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

const SITE_URL =
  "https://sabha.devvrats.in";

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { id } = await params;

  const post = await getBlogPostByIdServer(id);

  if (!post) {
    return {
      title: "Post not found | Devvrats Sabha",
    };
  }

  const canonicalUrl = `${SITE_URL}/blogs/${post.id}`;

  // Next.js generates this image from:
  // app/blogs/[id]/opengraph-image.tsx
  const ogImageUrl = `${canonicalUrl}/opengraph-image`;

  return {
    metadataBase: new URL(SITE_URL),

    title: `${post.title} | Devvrats Sabha`,
    description: post.excerpt,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      siteName: "Devvrats Sabha",
      url: canonicalUrl,

      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${post.title} | Devvrats Sabha`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,

      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${post.title} | Devvrats Sabha`,
        },
      ],
    },
  };
}
export default async function BlogPostPage({
  params,
}: BlogPostPageProps) {
  const { id } = await params;

  const post =
    await getBlogPostByIdServer(id);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-transparent text-[#1B1B18]">
        <article className="mx-auto max-w-3xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
          <div className="text-[12px] text-[#8A8577]">
            {post.date} · {post.readTime}
          </div>

          <h1 className="mt-3 font-serif text-[34px] leading-[1.15] tracking-[-0.02em] text-[#1B1B18] sm:text-[46px]">
            {post.title}
          </h1>

          <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[#777268]">
            {post.excerpt}
          </p>

          <div className="mt-7 flex items-center gap-3">
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.name}
                className="h-10 w-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-medium text-[#FAFAF7]"
                style={{
                  backgroundColor:
                    post.author.avatarColor,
                }}
              >
                {post.author.avatarInitials}
              </div>
            )}

            <div>
              <p className="text-[13px] font-medium text-[#1B1B18]">
                {post.author.name}
              </p>

              <p className="text-[12px] text-[#8A8577]">
                @{post.author.username}
              </p>
            </div>
          </div>

          {post.coverImage ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-[#E6E3DA]">
              <img
                src={post.coverImage}
                alt=""
                className="w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-9 space-y-6 text-[16px] leading-8 text-[#3A382F]">
            {post.content.map(
              (paragraph, index) => (
                <p key={index}>
                  {paragraph}
                </p>
              )
            )}
          </div>

          {post.tags.length > 0 && (
            <div className="mt-9 flex flex-wrap gap-2 border-t border-[#E6E3DA] pt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#E6E3DA] px-3 py-1.5 text-[11.5px] text-[#6E6A5F]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </main>

      <Footer />
    </>
  );
}