"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createBlogPost, type PostCategory } from "@/lib/supabase/blog";
import { createClient } from "@/lib/supabase/client";

const postCategories: PostCategory[] = [
  "Engineering",
  "Programming",
  "Systems",
  "Career",
  "Community",
  "Ideas",
];

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#6e6e73]";
const fieldClass =
  "w-full rounded-[12px] border border-[#d2d2d7] bg-white px-4 py-3 text-[16px] text-[#1d1d1f] outline-none transition-colors placeholder:text-[#6e6e73] focus:border-[#0071e3] disabled:opacity-60";

const countWords = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

export default function NewPostPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const titleInputRef = useRef<HTMLInputElement>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("Ideas");
  const [tagsInput, setTagsInput] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Require a signed-in user */
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    };

    check();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  /* Focus title once ready */
  useEffect(() => {
    if (checkingAuth) return;
    const raf = requestAnimationFrame(() => titleInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [checkingAuth]);

  const handlePublish = async () => {
    if (publishing) return;

    setError(null);

    const cleanTitle = title.trim();
    const cleanExcerpt = excerpt.trim();
    const cleanContent = content.trim();

    if (cleanTitle.length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    if (cleanTitle.length > 140) {
      setError("Title must be 140 characters or less.");
      return;
    }

    if (cleanExcerpt.length < 10) {
      setError("Excerpt must be at least 10 characters.");
      return;
    }

    if (cleanExcerpt.length > 300) {
      setError("Excerpt must be 300 characters or less.");
      return;
    }

    if (cleanContent.length < 20) {
      setError("Write a little more before publishing.");
      return;
    }

    const paragraphs = cleanContent
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      setError("Post content cannot be empty.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .filter((tag, index, array) => array.indexOf(tag) === index);

    if (tags.length > 10) {
      setError("You can add up to 10 tags.");
      return;
    }

    if (tags.some((tag) => tag.length > 30)) {
      setError("Each tag must be 30 characters or less.");
      return;
    }

    const readTime = Math.max(1, Math.ceil(countWords(paragraphs.join(" ")) / 200));

    setPublishing(true);

    const result = await createBlogPost({
      title: cleanTitle,
      excerpt: cleanExcerpt,
      content: paragraphs,
      category,
      tags,
      readTime,
    });

    if (result.error) {
      setError(result.error);
      setPublishing(false);
      return;
    }

    /* Success: go back to the feed and refetch */
    router.push("/blogs");
    router.refresh();
  };

  const liveReadTime = Math.max(1, Math.ceil(countWords(content) / 200));

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d2d2d7] border-t-[#1d1d1f]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
        <Link
          href="/blogs"
          className="text-[14px] text-[#0066cc] hover:underline"
        >
          ← Back to blogs
        </Link>

        <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[40px]">
          New post
        </h1>

        <div className="mt-6 space-y-5 rounded-[18px] bg-white p-5 sm:p-8">
          {/* Title */}
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="title" className={labelClass}>
                Title
              </label>
              <span className="text-[12px] text-[#6e6e73]">
                {title.length}/140
              </span>
            </div>
            <input
              ref={titleInputRef}
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              maxLength={140}
              disabled={publishing}
              className={fieldClass}
            />
          </div>

          {/* Excerpt */}
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="excerpt" className={labelClass}>
                Excerpt
              </label>
              <span className="text-[12px] text-[#6e6e73]">
                {excerpt.length}/300
              </span>
            </div>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A short description of your post…"
              maxLength={300}
              rows={2}
              disabled={publishing}
              className={`${fieldClass} resize-none`}
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className={labelClass}>
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post… (leave a blank line between paragraphs)"
              rows={12}
              disabled={publishing}
              className={`${fieldClass} resize-y leading-7`}
            />
          </div>

          {/* Category + tags */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className={labelClass}>
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PostCategory)}
                disabled={publishing}
                className={fieldClass}
              >
                {postCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tags" className={labelClass}>
                Tags
              </label>
              <input
                id="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tags, comma separated"
                disabled={publishing}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-[12px] border border-[#ff3b30]/30 bg-[#ff3b30]/5 px-4 py-3 text-[14px] text-[#d70015]"
            >
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-center text-[13px] text-[#6e6e73] sm:text-left">
              ~{liveReadTime} min read
            </span>

            <div className="flex gap-3">
              <Link
                href="/blogs"
                aria-disabled={publishing}
                className={`flex-1 rounded-[8px] border border-[#d2d2d7] px-5 py-2.5 text-center text-[15px] text-[#1d1d1f] hover:bg-[#f5f5f7] sm:flex-none ${
                  publishing ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 rounded-[8px] bg-[#1d1d1f] px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}