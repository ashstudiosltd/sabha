"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./feed-experience.module.css";

export interface FeedLikeSummary { like_count: number; liked: boolean }
export default function FeedLikeButton({ postId, userId, summary, disabled, onChange }: { postId: string; userId: string; summary?: FeedLikeSummary; disabled: boolean; onChange: (next: FeedLikeSummary) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liked = summary?.liked ?? false;
  const count = Number(summary?.like_count ?? 0);
  const toggle = async () => {
    if (busy || disabled || !summary) return;
    setBusy(true); setError(null);
    try {
      const supabase = createClient();
      const result = liked ? await supabase.from("feed_likes").delete().eq("post_id", postId).eq("user_id", userId) : await supabase.from("feed_likes").insert({ post_id: postId, user_id: userId });
      if (result.error && result.error.code !== "23505") throw new Error("Couldn’t update your like. Try again.");
      const { data, error: refreshError } = await supabase.rpc("get_feed_like_summaries", { p_post_ids: [postId] });
      if (refreshError || !data?.[0]) throw new Error("Couldn’t refresh likes. Try again.");
      onChange(data[0]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t update your like."); }
    finally { setBusy(false); }
  };
  return <span className="inline-flex flex-col gap-1"><button type="button" className={styles.replyToggle} aria-pressed={liked} disabled={busy || disabled || !summary} onClick={() => void toggle()} aria-label={liked ? "Unlike this post" : "Like this post"}><Heart size={15} fill={liked ? "currentColor" : "none"} /><span>{count || "Like"}</span></button>{error && <span className="max-w-40 text-[11px] text-red-600" role="status">{error}</span>}</span>;
}
