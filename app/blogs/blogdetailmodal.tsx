"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

/*
  THEMING HOOKS
  The blue left ruler and the blue tag chips read from CSS variables, so the
  upcoming external module can restyle them without touching this file.
  Set them on any ancestor:

    --blog-accent     left ruler color       (default #4a8fe7)
    --blog-tag-bg     tag background         (default #d6e4f8)
    --blog-tag-text   tag text color         (default #1a4a8f)
*/

/*
  SCROLL EFFECT
  The header is fixed above a separate scrolling body. The body's top and
  bottom edges are masked with a fade whose strength follows the scroll
  position, so content is cropped cleanly at the header edge and uncropped
  again when you scroll back. Two CSS variables drive it (set on the
  panel, no re-renders):

    --ft    0 → 1  top fade strength (content has scrolled under the header)
    --fb    0 → 1  bottom fade strength (more content below)
*/

const FADE_PX = 28; // height of the fade zone
const FADE_RANGE = 24; // scroll distance over which a fade reaches full strength

const MASK = `linear-gradient(to bottom, transparent 0, #000 calc(var(--ft, 0) * ${FADE_PX}px), #000 calc(100% - var(--fb, 0) * ${FADE_PX}px), transparent 100%)`;

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

  /* ---------------- SCROLL EFFECT REFS ---------------- */

  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  /* ---------------- SCROLL EFFECT ---------------- */

  const updateScrollFx = useCallback(() => {
    const panel = panelRef.current;
    const body = bodyRef.current;

    if (!panel || !body) return;

    const top = body.scrollTop;

    const max =
      body.scrollHeight - body.clientHeight;

    const clamp = (value: number) =>
      Math.min(1, Math.max(0, value));

    panel.style.setProperty(
      "--ft",
      clamp(top / FADE_RANGE).toFixed(3)
    );

    panel.style.setProperty(
      "--fb",
      clamp((max - top) / FADE_RANGE).toFixed(3)
    );
  }, []);

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

  /* ---------------- KEEP FADES IN SYNC ---------------- */
  /* Recalculates when content grows (comments, images) or the
     window resizes, so the bottom fade is right before any scroll. */

  useEffect(() => {
    if (!post) return;

    const body = bodyRef.current;
    const content = contentRef.current;

    if (!body || !content) return;

    updateScrollFx();

    const observer = new ResizeObserver(
      updateScrollFx
    );

    observer.observe(body);
    observer.observe(content);

    return () => observer.disconnect();
  }, [post, updateScrollFx]);

  /* ---------------- CLOSE ---------------- */

  const handleClose = () => {
    if (deleting || likeLoading) return;

    setVisible(false);

    window.setTimeout(onClose, 220);
  };

  /* ---------------- ESC KEY ---------------- */
  /* Closes the top-most layer first: profile card,
     then share sheet, then the modal itself. */

  useEffect(() => {
    if (!post) return;

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key !== "Escape") return;

      if (profileOpen) {
        setProfileOpen(false);
        return;
      }

      if (shareOpen) {
        setShareOpen(false);
        return;
      }

      handleClose();
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [post, profileOpen, shareOpen, handleClose]);

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
          className={`absolute inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity duration-200 ${
            visible
              ? "opacity-100"
              : "opacity-0"
          }`}
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Positioning layer (lets clicks fall through to the backdrop) */}

        <div className="pointer-events-none absolute inset-0 flex items-start justify-center px-4 py-6 sm:px-6 sm:py-12">
          {/* Panel: grey canvas + themeable left ruler */}

          <div
            ref={panelRef}
            className={`pointer-events-auto relative flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl origin-top flex-col rounded-[18px] border-l-[8px] border-l-[color:var(--blog-accent,#4a8fe7)] bg-[#f5f5f7] shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition-all duration-[220ms] ease-out sm:max-h-[calc(100dvh-6rem)] ${
              visible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-3 scale-95 opacity-0"
            }`}
          >
            {/* ---------- HEADER (fixed above the scrolling body) ---------- */}

            <div className="relative z-20 mx-3 mt-3 flex shrink-0 items-center justify-between gap-3 rounded-[14px] px-5 py-3 sm:mx-4 sm:mt-4 sm:px-8">
              {/* Glass sheen layer — white, with a faint top-lit gradient,
                  hairline edge and a shadow that deepens once content
                  slides beneath. A sibling (not a parent) so it never
                  affects the profile popover's click-away overlay. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-[14px] ring-1 ring-black/[0.05]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.86) 100%)",
                  backdropFilter:
                    "blur(16px) saturate(1.5)",
                  WebkitBackdropFilter:
                    "blur(16px) saturate(1.5)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,1), 0 6px 22px rgba(0,0,0,calc(0.03 + 0.06 * var(--ft, 0)))",
                }}
              />

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
                      className="flex h-full w-full items-center justify-center text-[11px] font-medium tracking-wide text-white"
                      style={{
                        backgroundColor:
                          post.author.avatarColor,
                      }}
                    >
                      {post.author.avatarInitials}
                    </div>
                  )}
                </button>

                <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[14px]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      setProfileOpen(
                        (current) => !current
                      );
                    }}
                    className="font-medium text-[#1d1d1f] transition-colors hover:text-[#0066cc]"
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
                    className="text-[#6e6e73] transition-colors hover:text-[#0066cc]"
                  >
                    @{post.author.username}
                  </button>

                  <span className="hidden text-[#6e6e73] sm:inline">
                    ·
                  </span>

                  <span className="hidden text-[#6e6e73] sm:inline">
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
                className="relative shrink-0 rounded-full p-1.5 text-[#6e6e73] transition-all duration-150 active:scale-90 hover:bg-black/5 hover:text-[#1d1d1f] disabled:opacity-40"
              >
                <CloseIcon className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* ---------- SCROLLING BODY (cropped at the header edge) ---------- */}

            <div
              ref={bodyRef}
              onScroll={updateScrollFx}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 sm:px-4 sm:pb-4"
              style={{
                WebkitMaskImage: MASK,
                maskImage: MASK,
              }}
            >
              <div
                ref={contentRef}
                className="flex flex-col gap-3"
              >
                {/* ---------- BLOCK: POST ---------- */}

                <div className="rounded-[14px] bg-white px-5 py-6 sm:px-8 sm:py-8">
                  <p className="text-[13px] text-[#6e6e73]">
                    {post.date} · {post.readTime}
                  </p>

                  <h1 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#1d1d1f] sm:text-[40px]">
                    {post.title}
                  </h1>

                  {post.coverImage ? (
                    <div className="mt-5 overflow-hidden rounded-[12px]">
                      <img
                        src={post.coverImage}
                        alt=""
                        className="h-48 w-full object-cover sm:h-64"
                      />
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-4 text-[16px] leading-[1.6] text-[#424245]">
                    {post.content.map(
                      (paragraph, index) => (
                        <p key={index}>
                          {paragraph}
                        </p>
                      )
                    )}
                  </div>

                  {/* TAGS (themeable) */}

                  {post.tags.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[4px] bg-[color:var(--blog-tag-bg,#d6e4f8)] px-2.5 py-1 text-[12px] font-medium text-[color:var(--blog-tag-text,#1a4a8f)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ---------- BLOCK: ACTIONS ---------- */}

                <div className="rounded-[14px] bg-white px-5 py-4 sm:px-8">
                  <div className="flex items-center gap-5">
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
                          ? "text-[#d70015]"
                          : "text-[#6e6e73] hover:text-[#d70015]"
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
                      className="flex items-center gap-1.5 text-[13px] text-[#6e6e73] transition-all duration-150 active:scale-90 hover:text-[#1d1d1f]"
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
                      className="ml-auto flex items-center gap-1.5 text-[13px] text-[#6e6e73] transition-all duration-150 active:scale-90 hover:text-[#1d1d1f]"
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
                      className="mt-2 text-[12px] text-[#d70015]"
                    >
                      {likeError}
                    </p>
                  )}
                </div>

                {/* ---------- BLOCK: COMMENTS ---------- */}

                <section
                  id="comments"
                  className="scroll-mt-8 rounded-[14px] bg-white px-5 py-6 sm:px-8"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                      Comments
                    </h2>

                    <span className="text-[13px] text-[#6e6e73]">
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
                      className="w-full resize-none rounded-[12px] border border-[#d2d2d7] bg-white px-3.5 py-3 text-[14px] leading-6 text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:outline-none disabled:opacity-60"
                    />

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[12px] text-[#86868b]">
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
                        className="rounded-[8px] bg-[#1d1d1f] px-4 py-2 text-[13px] font-medium text-white transition-all duration-150 hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {commentSubmitting
                          ? "Posting…"
                          : "Comment"}
                      </button>
                    </div>

                    {commentError && (
                      <p
                        role="alert"
                        className="mt-2 text-[12px] text-[#d70015]"
                      >
                        {commentError}
                      </p>
                    )}
                  </div>

                  {/* COMMENT LIST — single-column thread, X / Instagram style */}

                  <div className="mt-5">
                    {commentsLoading ? (
                      <p className="py-6 text-center text-[13px] text-[#6e6e73]">
                        Loading comments…
                      </p>
                    ) : comments.length === 0 ? (
                      <div className="rounded-[12px] bg-[#f5f5f7] px-4 py-6 text-center">
                        <p className="text-[16px] font-semibold text-[#1d1d1f]">
                          No comments yet
                        </p>

                        <p className="mt-1 text-[13px] text-[#6e6e73]">
                          Be the first to join the conversation.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {comments.map(
                          (comment) => (
                            <article
                              key={comment.id}
                              className="group -mx-2 rounded-[12px] px-2 py-3 transition-colors duration-150 hover:bg-[#f5f5f7]"
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
                                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8e8ed] text-[11px] font-medium text-[#1d1d1f]">
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
                                      className="text-[14px] font-semibold text-[#1d1d1f] transition-colors hover:text-[#0066cc]"
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
                                      className="text-[13px] text-[#6e6e73] transition-colors hover:text-[#0066cc]"
                                    >
                                      @
                                      {
                                        comment.authorUsername
                                      }
                                    </Link>

                                    <span className="text-[13px] text-[#86868b]">
                                      ·
                                    </span>

                                    <span className="text-[13px] text-[#86868b]">
                                      {
                                        comment.createdAt
                                      }
                                    </span>
                                  </div>

                                  <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-6 text-[#424245]">
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
                                      className="mt-1 text-[12px] text-[#86868b] opacity-100 transition-colors duration-150 hover:text-[#d70015] sm:opacity-0 sm:group-hover:opacity-100"
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

                {/* ---------- BLOCK: OWNER DELETE ---------- */}

                {canDelete && (
                  <div className="rounded-[14px] bg-white px-5 py-4 sm:px-8">
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
                        className="text-[13px] text-[#6e6e73] transition-colors duration-150 hover:text-[#d70015] disabled:opacity-40"
                      >
                        Delete post
                      </button>
                    ) : (
                      <div className="rounded-[12px] bg-[#f5f5f7] p-3">
                        <p className="text-[13px] leading-5 text-[#424245]">
                          Delete this post permanently?
                        </p>

                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete(false)
                            }
                            disabled={deleting}
                            className="rounded-[8px] border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-[13px] text-[#1d1d1f] transition-transform duration-150 active:scale-95 disabled:opacity-40"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="rounded-[8px] bg-[#d70015] px-3.5 py-1.5 text-[13px] font-medium text-white transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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