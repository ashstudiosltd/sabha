"use client";

import { useState } from "react";

import type { BlogPost } from "@/data/blog";
import ShareSheet from "@/app/components/ShareSheet";
import { ShareIcon } from "./icons";

interface BlogCardProps {
  post: BlogPost;
  onOpen: (post: BlogPost) => void;
}

export default function BlogCard({
  post,
  onOpen,
}: BlogCardProps) {
  const [shareOpen, setShareOpen] = useState(false);

  const handleShare = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setShareOpen(true);
  };

  const shareUrl = `https://sabha.devvrats.in/blogs/${post.id}`;

  return (
    <>
      <article
        className="group cursor-pointer overflow-hidden rounded-[18px] border-l-[8px] border-l-[#4a8fe7] bg-white p-4 transition-shadow duration-150 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:px-5 sm:py-5"
        onClick={() => onOpen(post)}
      >
        {/* Author */}
        <div className="flex items-center gap-3">
          {post.author.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt={post.author.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-medium text-white"
              style={{
                backgroundColor:
                  post.author.avatarColor,
              }}
            >
              {post.author.avatarInitials}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-[#1d1d1f]">
              {post.author.name}
            </p>

            <p className="text-[12px] text-[#6e6e73]">
              @{post.author.username} ·{" "}
              {post.date}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.022em] text-[#1d1d1f] transition-colors group-hover:text-[#0066cc]">
                {post.title}
              </h2>

              <p className="mt-1.5 line-clamp-3 text-[14px] leading-6 text-[#6e6e73]">
                {post.excerpt}
              </p>
            </div>

            {post.coverImage && (
              <img
                src={post.coverImage}
                alt=""
                className="hidden h-[82px] w-[110px] shrink-0 rounded-[12px] object-cover sm:block"
              />
            )}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-[4px] bg-[#d6e4f8] px-2.5 py-1 text-[11px] font-medium text-[#1a4a8f]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center gap-5 border-t border-[#e8e8ed] pt-3">
            <span className="text-[13px] text-[#6e6e73]">
              {post.likes}{" "}
              {post.likes === 1 ? "Like" : "Likes"}
            </span>

            <span className="text-[13px] text-[#6e6e73]">
              {post.comments}{" "}
              {post.comments === 1
                ? "Comment"
                : "Comments"}
            </span>

            <button
              type="button"
              onClick={handleShare}
              className="ml-auto flex items-center gap-1.5 text-[13px] text-[#6e6e73] transition-all duration-150 hover:text-[#1d1d1f] active:scale-90"
              aria-label="Share this post"
            >
              <ShareIcon className="h-[17px] w-[17px]" />

              <span className="hidden sm:inline">
                Share
              </span>
            </button>
          </div>
        </div>
      </article>

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