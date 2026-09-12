"use client";

import {
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useState } from "react";

import type { BlogPost } from "@/data/blog";
import ShareSheet from "@/app/components/ShareSheet";

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
        className="group cursor-pointer border-b border-[#E6E3DA] py-7"
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
            <p className="truncate text-[13px] font-medium text-[#1B1B18]">
              {post.author.name}
            </p>

            <p className="text-[11.5px] text-[#8A8577]">
              @{post.author.username} ·{" "}
              {post.date}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h2 className="text-[19px] font-semibold leading-[1.3] tracking-[-0.02em] text-[#1B1B18] transition-colors group-hover:text-[#2F4B3C]">
                {post.title}
              </h2>

              <p className="mt-2 line-clamp-3 text-[13.5px] leading-6 text-[#777268]">
                {post.excerpt}
              </p>
            </div>

            {post.coverImage && (
              <img
                src={post.coverImage}
                alt=""
                className="hidden h-[82px] w-[110px] shrink-0 rounded-[10px] object-cover sm:block"
              />
            )}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#F0EEE8] px-2.5 py-1 text-[10.5px] text-[#777268]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-5 flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-[13px] text-[#8A8577]">
              <Heart className="h-[17px] w-[17px]" />
              <span>{post.likes}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[13px] text-[#8A8577]">
              <MessageCircle className="h-[17px] w-[17px]" />
              <span>{post.comments}</span>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="ml-auto flex items-center gap-1.5 text-[13px] text-[#8A8577] transition-all duration-150 hover:text-[#1B1B18] active:scale-90"
              aria-label="Share this post"
            >
              <Share2 className="h-[17px] w-[17px]" />

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