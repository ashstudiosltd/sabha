import type { BlogPost, Category } from "@/data/blog";
import { createClient } from "@/lib/supabase/server";

export async function getBlogPostByIdServer(
  postId: string
): Promise<BlogPost | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      excerpt,
      content,
      category,
      tags,
      cover_image,
      read_time,
      created_at,
      author_id,
      profiles (
        name,
        username,
        avatar_url
      ),
      post_likes (
        id
      ),
      comments (
        id
      )
    `)
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.error(
      "Error fetching blog post:",
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  const profile = Array.isArray(data.profiles)
    ? data.profiles[0]
    : data.profiles;

  const authorName =
    profile?.name ?? "Unknown Author";

  const username =
    profile?.username ?? "user";

  const avatarUrl =
    profile?.avatar_url ?? null;

  const likeCount = Array.isArray(
    data.post_likes
  )
    ? data.post_likes.length
    : 0;

  const commentCount = Array.isArray(
    data.comments
  )
    ? data.comments.length
    : 0;

  const categories: Category[] = [
    "All",
    "Engineering",
    "Programming",
    "Systems",
    "Career",
    "Community",
    "Ideas",
  ];

  const normalizedCategory =
    categories.includes(
      data.category as Category
    )
      ? (data.category as Category)
      : "Ideas";

  const getInitials = (
    name: string
  ): string => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase()
      )
      .join("");
  };

  const getAvatarColor = (
    name: string
  ): string => {
    const colors = [
      "#2F4B3C",
      "#6E4B2A",
      "#3B4C6B",
      "#7A2E2E",
      "#4B4B4B",
    ];

    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash =
        name.charCodeAt(i) +
        ((hash << 5) - hash);
    }

    return colors[
      Math.abs(hash) % colors.length
    ];
  };

  return {
    id: data.id,
    authorId: data.author_id,

    author: {
      name: authorName,
      username,
      avatarInitials:
        getInitials(authorName),
      avatarColor:
        getAvatarColor(authorName),
      avatarUrl,
    },

    date: new Date(
      data.created_at
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),

    readTime: `${data.read_time} min read`,

    title: data.title,
    excerpt: data.excerpt,
    content: data.content ?? [],

    category: normalizedCategory,

    tags: data.tags ?? [],

    coverImage:
      data.cover_image ?? undefined,

    likes: likeCount,
    comments: commentCount,
  };
}