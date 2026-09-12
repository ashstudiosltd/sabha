import { createClient } from "@/lib/supabase/client";

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;

  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;

  content: string;
  createdAt: string;
}

function formatCommentDate(
  date: string
): string {
  return new Date(date).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
}

export async function getPostComments(
  postId: string
): Promise<BlogComment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(`
      id,
      post_id,
      user_id,
      content,
      created_at,
      profiles (
        name,
        username,
        avatar_url
      )
    `)
    .eq("post_id", postId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error fetching comments:",
      error
    );

    return [];
  }

  return (data ?? []).map((comment) => {
    const profile = Array.isArray(
      comment.profiles
    )
      ? comment.profiles[0]
      : comment.profiles;

    return {
      id: comment.id,

      postId: comment.post_id,

      userId: comment.user_id,

      authorName:
        profile?.name ?? "Unknown User",

      authorUsername:
        profile?.username ?? "user",

      authorAvatarUrl:
        profile?.avatar_url ?? null,

      content: comment.content,

      createdAt: formatCommentDate(
        comment.created_at
      ),
    };
  });
}

export async function createPostComment(
  postId: string,
  content: string
): Promise<{
  comment: BlogComment | null;
  error: string | null;
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return {
      comment: null,
      error:
        "You need to be signed in to comment.",
    };
  }

  const cleanContent =
    content.trim();

  if (cleanContent.length < 1) {
    return {
      comment: null,
      error:
        "Comment cannot be empty.",
    };
  }

  if (cleanContent.length > 1000) {
    return {
      comment: null,
      error:
        "Comment must be 1000 characters or less.",
    };
  }

  const { data, error } =
    await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: cleanContent,
      })
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles (
          name,
          username,
          avatar_url
        )
      `)
      .single();

  if (error) {
    console.error(
      "Error creating comment:",
      error
    );

    return {
      comment: null,
      error: error.message,
    };
  }

  const profile = Array.isArray(
    data.profiles
  )
    ? data.profiles[0]
    : data.profiles;

  return {
    comment: {
      id: data.id,

      postId: data.post_id,

      userId: data.user_id,

      authorName:
        profile?.name ?? "Unknown User",

      authorUsername:
        profile?.username ?? "user",

      authorAvatarUrl:
        profile?.avatar_url ?? null,

      content: data.content,

      createdAt: formatCommentDate(
        data.created_at
      ),
    },

    error: null,
  };
}

export async function deletePostComment(
  commentId: string
): Promise<{
  error: string | null;
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error:
        "You need to be signed in to delete comments.",
    };
  }

  const { error } =
    await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

  if (error) {
    console.error(
      "Error deleting comment:",
      error
    );

    return {
      error: error.message,
    };
  }

  return {
    error: null,
  };
}