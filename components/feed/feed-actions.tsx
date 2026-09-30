"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: {
    username: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

type FeedActionsProps = {
  feedItemId: string;
  initialLikes: number;
  initialComments: number;
  initialLiked: boolean;
};

export default function FeedActions({
  feedItemId,
  initialLikes,
  initialComments,
  initialLiked,
}: FeedActionsProps) {
  const supabase = createClient();

  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleLike() {
    if (loadingLike) return;

    setLoadingLike(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (liked) {
        const { error } = await supabase
          .from("feed_likes")
          .delete()
          .eq("feed_item_id", feedItemId)
          .eq("user_id", user.id);

        if (error) throw error;

        setLiked(false);
        setLikes((value) => Math.max(0, value - 1));
      } else {
        const { error } = await supabase.from("feed_likes").insert({
          feed_item_id: feedItemId,
          user_id: user.id,
        });

        if (error) throw error;

        setLiked(true);
        setLikes((value) => value + 1);
      }
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setLoadingLike(false);
    }
  }

  async function loadComments() {
    setLoadingComments(true);

    try {
      const { data, error } = await supabase
        .from("feed_comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (
            username,
            name,
            avatar_url
          )
        `)
        .eq("feed_item_id", feedItemId)
        .order("created_at", {
          ascending: true,
        });

      if (error) throw error;

      const formatted = (data ?? []).map((comment) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        author: Array.isArray(comment.profiles)
          ? comment.profiles[0] ?? null
          : comment.profiles ?? null,
      }));

      setComments(formatted);
    } catch (error) {
      console.error("Comment loading error:", error);
    } finally {
      setLoadingComments(false);
    }
  }

  async function toggleComments() {
    const next = !commentsOpen;

    setCommentsOpen(next);

    if (next) {
      await loadComments();
    }
  }

  async function submitComment() {
    const content = commentText.trim();

    if (!content || submittingComment) {
      return;
    }

    setSubmittingComment(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("feed_comments")
        .insert({
          feed_item_id: feedItemId,
          user_id: user.id,
          content,
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (
            username,
            name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const newComment: Comment = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        author: Array.isArray(data.profiles)
          ? data.profiles[0] ?? null
          : data.profiles ?? null,
      };

      setComments((current) => [...current, newComment]);
      setCommentsCount((value) => value + 1);
      setCommentText("");
    } catch (error) {
      console.error("Comment error:", error);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Share error:", error);
    }
  }

  const actionClass =
    "flex items-center gap-2 rounded-full px-3 py-2 text-[14px] text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50";

  return (
    <div className="mt-6">
      <div className="-ml-3 flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={handleLike}
          disabled={loadingLike}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          className={actionClass}
        >
          <Heart
            className="h-[20px] w-[20px]"
            strokeWidth={1.75}
            fill={liked ? "currentColor" : "none"}
          />
          {likes > 0 && <span>{likes}</span>}
        </button>

        <button
          type="button"
          onClick={toggleComments}
          aria-label="Comments"
          aria-expanded={commentsOpen}
          className={actionClass}
        >
          <MessageCircle className="h-[20px] w-[20px]" strokeWidth={1.75} />
          {commentsCount > 0 && <span>{commentsCount}</span>}
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share"
          className={actionClass}
        >
          <Share2 className="h-[20px] w-[20px]" strokeWidth={1.75} />
          {copied && <span>Copied</span>}
        </button>
      </div>

      {commentsOpen && (
        <div className="mt-6 space-y-6">
          {loadingComments ? (
            <p className="text-[14px] text-[#1d1d1f]">
              Loading comments...
            </p>
          ) : (
            <>
              {comments.length > 0 && (
                <div className="space-y-5">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f5f7]">
                        {comment.author?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={comment.author.avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[13px] font-medium text-[#1d1d1f]">
                            {(
                              comment.author?.name ??
                              comment.author?.username ??
                              "?"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[13px] font-semibold text-[#1d1d1f]">
                          {comment.author?.name ??
                            comment.author?.username ??
                            "Unknown"}
                        </p>

                        <p className="mt-1 text-[14px] leading-6 text-[#1d1d1f]">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {comments.length === 0 && (
                <p className="text-[14px] text-[#1d1d1f]">
                  No comments yet.
                </p>
              )}

              <div className="flex gap-3">
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitComment();
                    }
                  }}
                  maxLength={5000}
                  placeholder="Write a comment..."
                  className="min-w-0 flex-1 rounded-[12px] border border-[#d2d2d7] bg-white px-4 py-3 text-[16px] text-[#1d1d1f] outline-none transition-colors placeholder:text-[#6e6e73] focus:border-[#0071e3] sm:text-[15px]"
                />

                <button
                  type="button"
                  onClick={submitComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="rounded-[8px] bg-[#1d1d1f] px-5 text-[14px] font-medium text-white transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submittingComment ? "..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}