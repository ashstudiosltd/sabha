"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

import type { BlogPost } from "@/data/blog";

import {
  getPostLikeState,
  togglePostLike,
} from "@/lib/supabase/likes";

import {
  createPostComment,
  deletePostComment,
  getPostComments,
  type BlogComment,
} from "@/lib/supabase/comments";

import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  CloseIcon,
} from "./icons";

import ProfileQuickCard from "@/app/components/ProfileQuickCard";
import ShareSheet from "@/app/components/ShareSheet";

interface BlogDetailModalProps {
  post: BlogPost | null;
  onClose: () => void;
  onDelete: (postId: string) => Promise<void>;
  canDelete: boolean;
}

export default function BlogDetailModal({
  post,
  onClose,
  onDelete,
  canDelete,
}: BlogDetailModalProps) {
  const [visible, setVisible] = useState(false);

  const [confirmDelete, setConfirmDelete] =
    useState(false);

  const [deleting, setDeleting] = useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [shareOpen, setShareOpen] =
    useState(false);

  /* ---------------- LIKE STATE ---------------- */

  const [likeCount, setLikeCount] = useState(0);

  const [liked, setLiked] = useState(false);

  const [likeLoading, setLikeLoading] =
    useState(false);

  const [likeError, setLikeError] =
    useState<string | null>(null);

  /* ---------------- COMMENT STATE ---------------- */

  const [comments, setComments] =
    useState<BlogComment[]>([]);

  const [commentText, setCommentText] =
    useState("");

  const [commentsLoading, setCommentsLoading] =
    useState(false);

  const [commentSubmitting, setCommentSubmitting] =
    useState(false);

  const [commentError, setCommentError] =
    useState<string | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  /* ---------------- OPEN MODAL ---------------- */

  useEffect(() => {
    if (!post) {
      setVisible(false);
      setConfirmDelete(false);
      setDeleting(false);
      setProfileOpen(false);
      setShareOpen(false);

      setLikeCount(0);
      setLiked(false);
      setLikeError(null);

      setComments([]);
      setCommentText("");
      setCommentError(null);

      return;
    }

    setConfirmDelete(false);
    setDeleting(false);
    setProfileOpen(false);
    setShareOpen(false);

    setLikeError(null);

    setComments([]);
    setCommentText("");
    setCommentError(null);

    const raf = requestAnimationFrame(() =>
      setVisible(true)
    );

    return () => cancelAnimationFrame(raf);
  }, [post]);

  /* ---------------- LOAD LIKE STATE ---------------- */

  useEffect(() => {
    if (!post) return;

    let mounted = true;

    const loadLikeState = async () => {
      const state = await getPostLikeState(
        post.id
      );

      if (!mounted) return;

      setLikeCount(state.count);
      setLiked(state.liked);
    };

    loadLikeState();

    return () => {
      mounted = false;
    };
  }, [post]);

  /* ---------------- LOAD COMMENTS ---------------- */

  useEffect(() => {
    if (!post) return;

    let mounted = true;

    const loadComments = async () => {
      setCommentsLoading(true);

      const data = await getPostComments(
        post.id
      );

      if (!mounted) return;

      setComments(data);
      setCommentsLoading(false);
    };

    loadComments();

    return () => {
      mounted = false;
    };
  }, [post]);

  /* ---------------- LOAD USER ---------------- */

  useEffect(() => {
    if (!post) return;

    let mounted = true;

    const loadUser = async () => {
      const { createClient } =
        await import("@/lib/supabase/client");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setCurrentUserId(user?.id ?? null);
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [post]);

  /* ---------------- BODY SCROLL ---------------- */

  useEffect(() => {
    if (!post) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [post]);

  /* ---------------- CLOSE ---------------- */

  const handleClose = () => {
    if (deleting || likeLoading) return;

    setVisible(false);

    window.setTimeout(onClose, 220);
  };

  /* ---------------- LIKE ---------------- */

  const handleLike = async () => {
    if (!post || likeLoading) return;

    setLikeLoading(true);
    setLikeError(null);

    const previousLiked = liked;
    const previousCount = likeCount;

    setLiked(!previousLiked);

    setLikeCount(
      previousLiked
        ? Math.max(0, previousCount - 1)
        : previousCount + 1
    );

    const result = await togglePostLike(
      post.id
    );

    if (result.error) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setLikeError(result.error);
      setLikeLoading(false);

      return;
    }

    setLiked(result.liked);
    setLikeCount(result.count);
    setLikeLoading(false);
  };

  /* ---------------- CREATE COMMENT ---------------- */

  const handleSubmitComment = async () => {
    if (!post || commentSubmitting) return;

    setCommentError(null);

    const cleanComment =
      commentText.trim();

    if (!cleanComment) {
      setCommentError(
        "Write something before posting."
      );

      return;
    }

    if (cleanComment.length > 1000) {
      setCommentError(
        "Comment must be 1000 characters or less."
      );

      return;
    }

    setCommentSubmitting(true);

    const result =
      await createPostComment(
        post.id,
        cleanComment
      );

    if (result.error || !result.comment) {
      setCommentError(
        result.error ??
          "Unable to create comment."
      );

      setCommentSubmitting(false);

      return;
    }

    setComments((current) => [
      ...current,
      result.comment!,
    ]);

    setCommentText("");
    setCommentSubmitting(false);
  };

  /* ---------------- DELETE COMMENT ---------------- */

  const handleDeleteComment = async (
    commentId: string
  ) => {
    const result =
      await deletePostComment(commentId);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    setComments((current) =>
      current.filter(
        (comment) =>
          comment.id !== commentId
      )
    );
  };

  /* ---------------- DELETE POST ---------------- */

  const handleDelete = async () => {
    if (!post || deleting) return;

    setDeleting(true);

    try {
      await onDelete(post.id);
    } catch (error) {
      console.error(
        "Delete failed:",
        error
      );

      setDeleting(false);
    }
  };

  /* ---------------- PROFILE NAVIGATION ---------------- */

  const handleProfileClick = (
    event: MouseEvent
  ) => {
    event.stopPropagation();
  };

  if (!post) return null;

const shareUrl = `https://sabha.devvrats.in/blogs/${post.id}`;

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label={post.title}
      >
        {/* Backdrop */}

        <div
          className={`absolute inset-0 bg-[#1B1B18]/40 backdrop-blur-[2px] transition-opacity duration-200 ${
            visible
              ? "opacity-100"
              : "opacity-0"
          }`}
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal */}

        <div className="absolute inset-0 overflow-y-auto px-4 py-6 sm:px-6 sm:py-12">
          <div
            className={`mx-auto w-full max-w-2xl origin-top rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] shadow-xl transition-all duration-[220ms] ease-out ${
              visible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-3 scale-95 opacity-0"
            }`}
          >
            {/* HEADER */}

            <div className="flex items-center justify-between gap-3 border-b border-[#E6E3DA] px-5 py-4 sm:px-8">
              <div className="relative flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    setProfileOpen(
                      (current) => !current
                    );
                  }}
                  aria-label={`Open ${post.author.name}'s profile`}
                  className="h-9 w-9 shrink-0 overflow-hidden rounded-full transition-transform duration-150 active:scale-90"
                >
                  {post.author.avatarUrl ? (
                    <img
                      src={post.author.avatarUrl}
                      alt={post.author.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-[11px] font-medium tracking-wide text-[#FAFAF7]"
                      style={{
                        backgroundColor:
                          post.author.avatarColor,
                      }}
                    >
                      {post.author.avatarInitials}
                    </div>
                  )}
                </button>

                <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      setProfileOpen(
                        (current) => !current
                      );
                    }}
                    className="font-medium text-[#1B1B18] transition-colors hover:text-[#2F4B3C]"
                  >
                    {post.author.name}
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      setProfileOpen(
                        (current) => !current
                      );
                    }}
                    className="text-[#8A8577] transition-colors hover:text-[#2F4B3C]"
                  >
                    @{post.author.username}
                  </button>

                  <span className="hidden text-[#8A8577] sm:inline">
                    ·
                  </span>

                  <span className="hidden text-[#8A8577] sm:inline">
                    {post.date}
                  </span>
                </div>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(event) => {
                        event.stopPropagation();
                        setProfileOpen(false);
                      }}
                      aria-hidden="true"
                    />

                    <div
                      className="absolute left-0 top-12 z-50 w-[calc(100vw-40px)] max-w-[360px] sm:w-[360px]"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <ProfileQuickCard
                        username={
                          post.author.username
                        }
                        onClose={() =>
                          setProfileOpen(false)
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={
                  deleting ||
                  likeLoading ||
                  commentSubmitting
                }
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-[#5B5748] transition-all duration-150 active:scale-90 hover:bg-[#F2F1EA] hover:text-[#1B1B18] disabled:opacity-40"
              >
                <CloseIcon className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* POST BODY */}

            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <p className="text-[12px] text-[#8A8577]">
                {post.date} · {post.readTime}
              </p>

              <h1 className="mt-2 font-serif text-[26px] leading-tight text-[#1B1B18] sm:text-[30px]">
                {post.title}
              </h1>

              {post.coverImage ? (
                <div className="mt-5 overflow-hidden rounded-sm border border-[#E6E3DA]">
                  <img
                    src={post.coverImage}
                    alt=""
                    className="h-48 w-full object-cover sm:h-64"
                  />
                </div>
              ) : null}

              <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-[#3A382F]">
                {post.content.map(
                  (paragraph, index) => (
                    <p key={index}>
                      {paragraph}
                    </p>
                  )
                )}
              </div>

              {/* TAGS */}

              {post.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#E6E3DA] px-2.5 py-1 text-[12px] text-[#6E6A5F]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* ACTIONS */}

              <div className="mt-6 flex items-center gap-5 border-t border-[#E6E3DA] pt-5">
                {/* LIKE */}

                <button
                  type="button"
                  onClick={handleLike}
                  disabled={likeLoading}
                  aria-label={
                    liked
                      ? `Unlike post. ${likeCount} likes`
                      : `Like post. ${likeCount} likes`
                  }
                  aria-pressed={liked}
                  className={`flex items-center gap-1.5 text-[13px] transition-all duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60 ${
                    liked
                      ? "text-[#7A2E2E]"
                      : "text-[#8A8577] hover:text-[#7A2E2E]"
                  }`}
                >
                  <HeartIcon
                    className={`h-[17px] w-[17px] ${
                      liked
                        ? "fill-current"
                        : ""
                    }`}
                  />

                  <span>{likeCount}</span>
                </button>

                {/* COMMENT COUNT */}

                <button
                  type="button"
                  onClick={() => {
                    const element =
                      document.getElementById(
                        "comments"
                      );

                    element?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="flex items-center gap-1.5 text-[13px] text-[#8A8577] transition-all duration-150 active:scale-90 hover:text-[#1B1B18]"
                  aria-label={`${comments.length} comments`}
                >
                  <CommentIcon className="h-[17px] w-[17px]" />

                  <span>
                    {comments.length}
                  </span>
                </button>

                {/* SHARE */}

                <button
                  type="button"
                  onClick={() =>
                    setShareOpen(true)
                  }
                  className="ml-auto flex items-center gap-1.5 text-[13px] text-[#8A8577] transition-all duration-150 active:scale-90 hover:text-[#1B1B18]"
                  aria-label="Share this post"
                >
                  <ShareIcon className="h-[17px] w-[17px]" />

                  <span className="hidden sm:inline">
                    Share
                  </span>
                </button>
              </div>

              {likeError && (
                <p
                  role="alert"
                  className="mt-2 text-[11.5px] text-[#7A2E2E]"
                >
                  {likeError}
                </p>
              )}

              {/* COMMENTS */}

              <section
                id="comments"
                className="mt-8 border-t border-[#E6E3DA] pt-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-[20px] text-[#1B1B18]">
                    Comments
                  </h2>

                  <span className="text-[12px] text-[#8A8577]">
                    {comments.length}
                  </span>
                </div>

                {/* COMMENT INPUT */}

                <div className="mt-4">
                  <textarea
                    value={commentText}
                    onChange={(event) =>
                      setCommentText(
                        event.target.value
                      )
                    }
                    placeholder="Write a comment…"
                    maxLength={1000}
                    rows={3}
                    disabled={commentSubmitting}
                    className="w-full resize-none rounded-xl border border-[#E6E3DA] bg-transparent px-3 py-2.5 text-[13.5px] leading-6 text-[#1B1B18] placeholder:text-[#A6A192] focus:border-[#2F4B3C] focus:outline-none disabled:opacity-60"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[#A6A192]">
                      {commentText.length}/1000
                    </span>

                    <button
                      type="button"
                      onClick={
                        handleSubmitComment
                      }
                      disabled={
                        commentSubmitting ||
                        !commentText.trim()
                      }
                      className="rounded-full bg-[#1B1B18] px-4 py-1.5 text-[12.5px] font-medium text-[#FAFAF7] transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {commentSubmitting
                        ? "Posting…"
                        : "Comment"}
                    </button>
                  </div>

                  {commentError && (
                    <p
                      role="alert"
                      className="mt-2 text-[11.5px] text-[#7A2E2E]"
                    >
                      {commentError}
                    </p>
                  )}
                </div>

                {/* COMMENT LIST */}

                <div className="mt-6">
                  {commentsLoading ? (
                    <p className="py-6 text-center text-[12.5px] text-[#8A8577]">
                      Loading comments…
                    </p>
                  ) : comments.length === 0 ? (
                    <div className="rounded-xl border border-[#E6E3DA] px-4 py-6 text-center">
                      <p className="font-serif text-[16px] text-[#1B1B18]">
                        No comments yet
                      </p>

                      <p className="mt-1 text-[12px] text-[#8A8577]">
                        Be the first to join the conversation.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      {comments.map(
                        (comment) => (
                          <article
                            key={comment.id}
                            className="group"
                          >
                            <div className="flex items-start gap-3">
                              {comment.authorAvatarUrl ? (
                                <img
                                  src={
                                    comment.authorAvatarUrl
                                  }
                                  alt={
                                    comment.authorName
                                  }
                                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2F4B3C] text-[10px] font-medium text-[#FAFAF7]">
                                  {comment.authorName
                                    .split(" ")
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map(
                                      (part) =>
                                        part[0]?.toUpperCase()
                                    )
                                    .join("") ||
                                    "U"}
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-1.5">
                                  <Link
                                    href={`/profile/${comment.authorUsername}`}
                                    onClick={
                                      handleProfileClick
                                    }
                                    className="text-[13px] font-medium text-[#1B1B18] transition-colors hover:text-[#2F4B3C]"
                                  >
                                    {
                                      comment.authorName
                                    }
                                  </Link>

                                  <Link
                                    href={`/profile/${comment.authorUsername}`}
                                    onClick={
                                      handleProfileClick
                                    }
                                    className="text-[12px] text-[#8A8577] transition-colors hover:text-[#2F4B3C]"
                                  >
                                    @
                                    {
                                      comment.authorUsername
                                    }
                                  </Link>

                                  <span className="text-[12px] text-[#A6A192]">
                                    ·
                                  </span>

                                  <span className="text-[12px] text-[#A6A192]">
                                    {
                                      comment.createdAt
                                    }
                                  </span>
                                </div>

                                <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-6 text-[#3A382F]">
                                  {
                                    comment.content
                                  }
                                </p>

                                {currentUserId ===
                                  comment.userId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteComment(
                                        comment.id
                                      )
                                    }
                                    className="mt-1.5 text-[11px] text-[#A6A192] opacity-100 transition-colors duration-150 hover:text-[#7A2E2E] sm:opacity-0 sm:group-hover:opacity-100"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* OWNER DELETE */}

              {canDelete && (
                <div className="mt-8 border-t border-[#E6E3DA] pt-4">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete(true)
                      }
                      disabled={
                        deleting ||
                        likeLoading ||
                        commentSubmitting
                      }
                      className="text-[12.5px] text-[#8A8577] transition-colors duration-150 hover:text-[#7A2E2E] disabled:opacity-40"
                    >
                      Delete post
                    </button>
                  ) : (
                    <div className="rounded-xl border border-[#E6E3DA] bg-[#F3F0E9] p-3">
                      <p className="text-[12.5px] leading-5 text-[#5B5748]">
                        Delete this post permanently?
                      </p>

                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete(false)
                          }
                          disabled={deleting}
                          className="rounded-full border border-[#DCD8CC] px-3 py-1.5 text-[12px] text-[#6E6A5F] transition-transform duration-150 active:scale-95 disabled:opacity-40"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="rounded-full bg-[#7A2E2E] px-3.5 py-1.5 text-[12px] font-medium text-[#FAFAF7] transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deleting
                            ? "Deleting…"
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SHARE SHEET */}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareData={{
          title: post.title,
          text: post.excerpt,
          url: shareUrl,
        }}
      />
    </>
  );
}