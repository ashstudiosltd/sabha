import { createClient } from "@/lib/supabase/client";

export interface PostLikeState {
  count: number;
  liked: boolean;
}

export async function getPostLikeState(
  postId: string
): Promise<PostLikeState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count, error: countError } = await supabase
    .from("post_likes")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("post_id", postId);

  if (countError) {
    console.error(
      "Error fetching like count:",
      countError
    );

    return {
      count: 0,
      liked: false,
    };
  }

  if (!user) {
    return {
      count: count ?? 0,
      liked: false,
    };
  }

  const { data: existingLike, error: likeError } =
    await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (likeError) {
    console.error(
      "Error checking user like:",
      likeError
    );

    return {
      count: count ?? 0,
      liked: false,
    };
  }

  return {
    count: count ?? 0,
    liked: !!existingLike,
  };
}

export async function togglePostLike(
  postId: string
): Promise<{
  liked: boolean;
  count: number;
  error: string | null;
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      liked: false,
      count: 0,
      error: "You need to be signed in to like posts.",
    };
  }

  const { data: existingLike, error: existingError } =
    await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingError) {
    console.error(
      "Error checking existing like:",
      existingError
    );

    return {
      liked: false,
      count: 0,
      error: existingError.message,
    };
  }

  if (existingLike) {
    const { error: deleteError } = await supabase
      .from("post_likes")
      .delete()
      .eq("id", existingLike.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Error removing like:",
        deleteError
      );

      return {
        liked: true,
        count: 0,
        error: deleteError.message,
      };
    }
  } else {
    const { error: insertError } = await supabase
      .from("post_likes")
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    if (insertError) {
      console.error(
        "Error adding like:",
        insertError
      );

      return {
        liked: false,
        count: 0,
        error: insertError.message,
      };
    }
  }

  const { count, error: countError } = await supabase
    .from("post_likes")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("post_id", postId);

  if (countError) {
    console.error(
      "Error refreshing like count:",
      countError
    );
  }

  return {
    liked: !existingLike,
    count: count ?? 0,
    error: null,
  };
}