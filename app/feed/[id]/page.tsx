import ProjectAttachment,{ProjectReferences} from "@/components/project-references/project-attachment";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import SabhaNavbar from "@/components/sabha/sabha-navbar";
import { getFeedPostForShare } from "@/lib/supabase/feed-share-server";
import styles from "./shared-feed-post.module.css";

const SITE_URL = "https://sabha.devvrats.in";

interface SharedFeedPageProps {
  params: Promise<{ id: string }>;
}

function cleanDescription(body: string) {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

function displayTitle(post: { title: string | null; author_name: string; post_type: string }) {
  return post.title?.trim() || `${post.author_name}’s ${post.post_type === "project" ? "project update" : "conversation"}`;
}

export async function generateMetadata({ params }: SharedFeedPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getFeedPostForShare(id);
  if (!post) return { title: "Feed post | Devvrats Sabha" };

  const title = displayTitle(post);
  const description = cleanDescription(post.body);
  const canonicalUrl = `${SITE_URL}/feed/${post.id}`;
  const imageUrl = `${canonicalUrl}/opengraph-image`;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} | Devvrats Sabha`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Devvrats Sabha",
      url: canonicalUrl,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${title} | Devvrats Sabha Feed` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${title} | Devvrats Sabha Feed` }],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function SharedFeedPage({ params }: SharedFeedPageProps) {
  const { id } = await params;
  const post = await getFeedPostForShare(id);
  if (!post) notFound();

  return (
    <main className="sabha-design">
      <SabhaNavbar section="feed" />
      <div className={styles.page}>
        <article className={`${styles.post} sabha-surface`}>
          <header className={styles.author}>
            {post.author_avatar_url ? (
              <Image src={post.author_avatar_url} alt="" width={42} height={42} unoptimized className={styles.avatar} referrerPolicy="no-referrer" />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {post.author_name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
              </span>
            )}
            <span className={styles.authorText}>
              <strong>{post.author_name}</strong>
              <small>@{post.author_username} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(post.created_at))}</small>
            </span>
            <span className={styles.postType}>{post.post_type === "project" ? "Project update" : "Conversation"}</span>
          </header>

          <h1>{displayTitle(post)}</h1>
          <p className={styles.body}>{post.body}</p>

          {post.resource_url && post.resource_kind === "project" ? <ProjectReferences references={[post.resource_url]}><ProjectAttachment reference={post.resource_url}/></ProjectReferences> : post.resource_url && post.resource_label && (
            <a className={styles.reference} href={post.resource_url} target={post.resource_url.startsWith("/") ? undefined : "_blank"} rel={post.resource_url.startsWith("/") ? undefined : "noreferrer"}>
              <span><small>{post.resource_kind ?? "Reference"}</small><strong>{post.resource_label}</strong></span>
              <span aria-hidden="true">↗</span>
            </a>
          )}

          <footer className={styles.footer}>
            <span>Shared from Sabha Feed</span>
            <Link href="/feed" className="sabha-button sabha-button-primary">Open the conversation</Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
