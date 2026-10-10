import { createClient } from "@/lib/supabase/server";

export interface FeedSharePost {
  id: string;
  post_type: "conversation" | "project";
  title: string | null;
  body: string;
  resource_kind: string | null;
  resource_url: string | null;
  resource_label: string | null;
  created_at: string;
  author_name: string;
  author_username: string;
  author_avatar_url: string | null;
}

export async function getFeedPostForShare(postId: string): Promise<FeedSharePost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_feed_post_for_share", {
    p_post_id: postId,
  });

  if (error) {
    console.error("Unable to load shared Feed post:", error.message);
    return null;
  }

  const post = Array.isArray(data) ? data[0] : data;
  return post ?? null;
}
