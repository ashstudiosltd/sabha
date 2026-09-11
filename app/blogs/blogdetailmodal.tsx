"use client";

import { useEffect, useState } from "react";
import type { BlogPost } from "@/data/blog";
import { HeartIcon, CommentIcon, ShareIcon, CloseIcon } from "./icons";

interface BlogDetailModalProps {
  post: BlogPost | null;
  onClose: () => void;
}

// Full-post view. Opens with a short scale + fade so the card feels like it
// "pops up" into this — closes the same way in reverse before unmounting.
export default function BlogDetailModal({ post, onClose }: BlogDetailModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!post) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [post]);

  const handleClose = () => {
    setVisible(false);
    window.setTimeout(onClose, 220);
  };

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={post.title}>
      <div
        className={`absolute inset-0 bg-[#1B1B18]/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 overflow-y-auto px-4 py-6 sm:px-6 sm:py-12">
        <div
          className={`mx-auto w-full max-w-2xl origin-top rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] shadow-xl transition-all duration-[220ms] ease-out ${
            visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[#E6E3DA] px-5 py-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tracking-wide text-[#FAFAF7]"
                style={{ backgroundColor: post.author.avatarColor }}
                aria-hidden="true"
              >
                {post.author.avatarInitials}
              </div>
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px]">
                <span className="font-medium text-[#1B1B18]">{post.author.name}</span>
                <span className="text-[#8A8577]">@{post.author.username}</span>
                <span className="hidden text-[#8A8577] sm:inline">·</span>
                <span className="hidden text-[#8A8577] sm:inline">{post.date}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="shrink-0 rounded-full p-1.5 text-[#5B5748] transition-all duration-150 active:scale-90 hover:bg-[#F2F1EA] hover:text-[#1B1B18]"
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Body */}
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
              {post.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

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

            <div className="mt-6 flex items-center gap-5 border-t border-[#E6E3DA] pt-5 text-[#8A8577]">
              <button
                type="button"
                className="flex items-center gap-1.5 text-[13px] transition-all duration-150 active:scale-90 hover:text-[#7A2E2E]"
                aria-label={`${post.likes} likes`}
              >
                <HeartIcon className="h-[17px] w-[17px]" />
                <span>{post.likes}</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-[13px] transition-all duration-150 active:scale-90 hover:text-[#1B1B18]"
                aria-label={`${post.comments} comments`}
              >
                <CommentIcon className="h-[17px] w-[17px]" />
                <span>{post.comments}</span>
              </button>
              <button
                type="button"
                className="ml-auto flex items-center gap-1.5 text-[13px] transition-all duration-150 active:scale-90 hover:text-[#1B1B18]"
                aria-label="Share this post"
              >
                <ShareIcon className="h-[17px] w-[17px]" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}