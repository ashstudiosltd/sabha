"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

import type { BlogPost } from "@/data/blog";

import {
  getPostLikeState,
  togglePostLike,
} from "@/lib/supabase/likes";

import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
} from "./icons";

interface BlogCardProps {
  post: BlogPost;
  onOpen: (post: BlogPost) => void;
}

export default function BlogCard({
  post,
  onOpen,
}: BlogCardProps) {
  const [likeCount, setLikeCount] =
    useState(post.likes);

  const [liked, setLiked] = useState(false);

  const [likeLoading, setLikeLoading] =
    useState(false);

  const [likeError, setLikeError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadLikeState = async () => {
      const state = await getPostLikeState(post.id);

      if (!mounted) return;

      setLikeCount(state.count);
      setLiked(state.liked);
    };

    loadLikeState();

    return () => {
      mounted = false;
    };
  }, [post.id]);

  const stop = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const handleLike = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();

    if (likeLoading) return;

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

    const result = await togglePostLike(post.id);

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

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(post);
        }
      }}
      className="group cursor-pointer border-b border-[#E6E3DA] py-8 outline-none transition-transform duration-150 first:pt-0 last:border-b-0 active:scale-[0.99]"
    >
      {/* Author */}

      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tracking-wide text-[#FAFAF7]"
          style={{
            backgroundColor:
              post.author.avatarColor,
          }}
          aria-hidden="true"
        >
          {post.author.avatarInitials}
        </div>

        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px]">
          <span className="font-medium text-[#1B1B18]">
            {post.author.name}
          </span>

          <span className="text-[#8A8577]">
            @{post.author.username}
          </span>

          <span className="text-[#8A8577]">·</span>

          <span className="text-[#8A8577]">
            {post.date}
          </span>

          <span className="text-[#8A8577]">·</span>

          <span className="text-[#8A8577]">
            {post.readTime}
          </span>
        </div>
      </div>

      {/* Content */}

      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[20px] leading-snug text-[#1B1B18] sm:text-[22px]">
            <span className="decoration-[#C9C4B4] underline-offset-4 group-hover:underline">
              {post.title}
            </span>
          </h3>

          <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-[#5B5748] sm:line-clamp-3">
            {post.excerpt}
          </p>
        </div>

        {post.coverImage ? (
          <div className="hidden shrink-0 overflow-hidden rounded-sm border border-[#E6E3DA] sm:block">
            <img
              src={post.coverImage}
              alt=""
              className="h-24 w-32 object-cover grayscale-[15%] transition duration-300 group-hover:grayscale-0"
            />
          </div>
        ) : null}
      </div>

      {/* Tags */}

      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <a
              key={tag}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                stop(event);
              }}
              className="rounded-full border border-[#E6E3DA] px-2.5 py-1 text-[12px] text-[#6E6A5F] transition-all duration-150 active:scale-95 hover:border-[#2F4B3C] hover:text-[#2F4B3C]"
            >
              #{tag}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}

      <div className="mt-4 flex items-center gap-5 text-[#8A8577]">
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
          className={`flex items-center gap-1.5 text-[13px] transition-all duration-150 active:scale-90 disabled:opacity-60 ${
            liked
              ? "text-[#7A2E2E]"
              : "text-[#8A8577] hover:text-[#7A2E2E]"
          }`}
        >
          <HeartIcon
            className={`h-[17px] w-[17px] ${
              liked ? "fill-current" : ""
            }`}
          />

          <span>{likeCount}</span>
        </button>

        {/* Comment count only */}

        <button
          type="button"
          onClick={stop}
          className="flex items-center gap-1.5 text-[13px] text-[#8A8577]"
          aria-label={`${post.comments} comments`}
        >
          <CommentIcon className="h-[17px] w-[17px]" />

          <span>{post.comments}</span>
        </button>

        <button
          type="button"
          onClick={stop}
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
          className="mt-2 text-[11px] text-[#7A2E2E]"
        >
          {likeError}
        </p>
      )}
    </article>
  );
}