import { createClient } from "@/lib/supabase/client";
import type { BlogPost, Category } from "@/data/blog";

const categories: Category[] = [
  "All",
  "Engineering",
  "Programming",
  "Systems",
  "Career",
  "Community",
  "Ideas",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getAvatarColor(name: string): string {
  const colors = [
    "#2F4B3C",
    "#6E4B2A",
    "#3B4C6B",
    "#7A2E2E",
    "#4B4B4B",
  ];

  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function normalizeCategory(category: string): Category {
  if (categories.includes(category as Category)) {
    return category as Category;
  }

  return "Ideas";
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const supabase = createClient();

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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }

  return (data ?? []).map((post) => {
    const profile = Array.isArray(post.profiles)
      ? post.profiles[0]
      : post.profiles;

    const authorName = profile?.name ?? "Unknown Author";
    const username = profile?.username ?? "user";

    const likeCount = Array.isArray(post.post_likes)
      ? post.post_likes.length
      : 0;

    const commentCount = Array.isArray(post.comments)
      ? post.comments.length
      : 0;

    return {
      id: post.id,

      authorId: post.author_id,

      author: {
        name: authorName,
        username,
        avatarInitials: getInitials(authorName),
        avatarColor: getAvatarColor(authorName),
      },

      date: formatDate(post.created_at),

      readTime: `${post.read_time} min read`,

      title: post.title,

      excerpt: post.excerpt,

      content: post.content ?? [],

      category: normalizeCategory(post.category),

      tags: post.tags ?? [],

      coverImage: post.cover_image ?? undefined,

      likes: likeCount,

      comments: commentCount,
    };
  });
}

export type PostCategory = Exclude<Category, "All">;

export interface CreateBlogPostInput {
  title: string;
  excerpt: string;
  content: string[];
  category: PostCategory;
  tags: string[];
  readTime: number;
}

export async function createBlogPost(
  input: CreateBlogPostInput
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "You need to be signed in to publish a post.",
    };
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    category: input.category,
    tags: input.tags,
    cover_image: null,
    read_time: input.readTime,
  });

  if (error) {
    console.error("Error creating blog post:", error);

    return {
      error: error.message,
    };
  }

  return {
    error: null,
  };
}

export async function deleteBlogPost(
  postId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "You need to be signed in to delete a post.",
    };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) {
    console.error("Error deleting blog post:", error);

    return {
      error: error.message,
    };
  }

  return {
    error: null,
  };
}