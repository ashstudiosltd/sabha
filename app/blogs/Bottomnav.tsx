"use client";

import { useEffect, useRef, useState } from "react";
import {
  GridDotsIcon,
  SearchIcon,
  PlusIcon,
  ProfileIcon,
  CloseIcon,
} from "./icons";
import {
  createBlogPost,
  type PostCategory,
} from "@/lib/supabase/blog";

type Tab = "feed" | "search" | "post" | "profile";

interface MobileBottomNavProps {
  query: string;
  onQueryChange: (query: string) => void;
  onPostCreated: () => Promise<void>;
}

const tabs: {
  id: Tab;
  label: string;
  Icon: typeof GridDotsIcon;
}[] = [
  { id: "feed", label: "Feed", Icon: GridDotsIcon },
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "post", label: "New post", Icon: PlusIcon },
  { id: "profile", label: "Profile", Icon: ProfileIcon },
];

const postCategories: PostCategory[] = [
  "Engineering",
  "Programming",
  "Systems",
  "Career",
  "Community",
  "Ideas",
];

export default function MobileBottomNav({
  query,
  onQueryChange,
  onPostCreated,
}: MobileBottomNavProps) {
  const [active, setActive] = useState<Tab>("feed");

  const [expanded, setExpanded] = useState<
    "search" | "post" | null
  >(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] =
    useState<PostCategory>("Ideas");
  const [tagsInput, setTagsInput] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expanded === "search") {
      const raf = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });

      return () => cancelAnimationFrame(raf);
    }

    if (expanded === "post") {
      const raf = requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });

      return () => cancelAnimationFrame(raf);
    }
  }, [expanded]);

  const closeExpanded = () => {
    if (!publishing) {
      setExpanded(null);
      setError(null);
    }
  };

  const resetComposer = () => {
    setTitle("");
    setExcerpt("");
    setContent("");
    setCategory("Ideas");
    setTagsInput("");
    setError(null);
  };

  const handleTabTap = (tab: Tab) => {
    if (tab === "search" || tab === "post") {
      setActive(tab);

      if (expanded === tab) {
        if (!publishing) {
          setExpanded(null);
          setError(null);
        }

        return;
      }

      setError(null);
      setExpanded(tab);

      return;
    }

    setActive(tab);
    setExpanded(null);
    setError(null);
  };

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
      .filter(
        (tag, index, array) =>
          array.indexOf(tag) === index
      );

    if (tags.length > 10) {
      setError("You can add up to 10 tags.");
      return;
    }

    if (tags.some((tag) => tag.length > 30)) {
      setError("Each tag must be 30 characters or less.");
      return;
    }

    const wordCount = paragraphs
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;

    const readTime = Math.max(
      1,
      Math.ceil(wordCount / 200)
    );

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

    try {
      await onPostCreated();

      resetComposer();
      setExpanded(null);
      setActive("post");
    } catch (refreshError) {
      console.error(
        "Post created but feed refresh failed:",
        refreshError
      );

      resetComposer();
      setExpanded(null);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-30 bg-black/[0.04] transition-opacity duration-200"
          onClick={closeExpanded}
          aria-hidden="true"
        />
      )}

      {/* Bottom navigation */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        {/* Expanding search / composer */}
        <div
          className={`mx-auto w-full max-w-[720px] px-4 pb-3 transition-all duration-[220ms] ease-out ${
            expanded
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0"
          }`}
          style={{
            transformOrigin: "bottom center",
          }}
        >
          {/* Search */}
          {expanded === "search" && (
            <div className="flex items-center gap-2 rounded-full border border-[#E6E3DA] bg-[#FAFAF7] px-4 py-2.5 shadow-lg">
              <SearchIcon className="h-[17px] w-[17px] shrink-0 text-[#8A8577]" />

              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) =>
                  onQueryChange(event.target.value)
                }
                placeholder="Search posts, tags, authors"
                className="w-full bg-transparent text-[14px] text-[#1B1B18] placeholder:text-[#A6A192] focus:outline-none"
              />

              <button
                type="button"
                onClick={closeExpanded}
                aria-label="Close search"
                className="shrink-0 rounded-full p-1 text-[#8A8577] transition-transform duration-150 active:scale-90"
              >
                <CloseIcon className="h-[15px] w-[15px]" />
              </button>
            </div>
          )}

          {/* New post */}
          {expanded === "post" && (
            <div className="max-h-[78vh] overflow-y-auto rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] p-3 shadow-lg sm:p-4">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[12.5px] font-medium text-[#1B1B18]">
                  New post
                </span>

                <button
                  type="button"
                  onClick={closeExpanded}
                  disabled={publishing}
                  aria-label="Close composer"
                  className="rounded-full p-1 text-[#8A8577] transition-transform duration-150 active:scale-90 disabled:opacity-40"
                >
                  <CloseIcon className="h-[15px] w-[15px]" />
                </button>
              </div>

              <div className="space-y-2.5">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Post title"
                  maxLength={140}
                  disabled={publishing}
                  className="w-full rounded-xl border border-[#E6E3DA] bg-transparent px-3 py-2.5 text-[14px] font-medium text-[#1B1B18] placeholder:text-[#A6A192] focus:border-[#2F4B3C] focus:outline-none disabled:opacity-60"
                />

                <textarea
                  value={excerpt}
                  onChange={(event) =>
                    setExcerpt(event.target.value)
                  }
                  placeholder="A short description of your post…"
                  maxLength={300}
                  rows={2}
                  disabled={publishing}
                  className="w-full resize-none rounded-xl border border-[#E6E3DA] bg-transparent px-3 py-2.5 text-[13.5px] text-[#1B1B18] placeholder:text-[#A6A192] focus:border-[#2F4B3C] focus:outline-none disabled:opacity-60"
                />

                <textarea
                  value={content}
                  onChange={(event) =>
                    setContent(event.target.value)
                  }
                  placeholder="Write your post…"
                  rows={6}
                  disabled={publishing}
                  className="w-full resize-none rounded-xl border border-[#E6E3DA] bg-transparent px-3 py-2.5 text-[13.5px] leading-6 text-[#1B1B18] placeholder:text-[#A6A192] focus:border-[#2F4B3C] focus:outline-none disabled:opacity-60"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value as PostCategory
                      )
                    }
                    disabled={publishing}
                    className="w-full rounded-xl border border-[#E6E3DA] bg-[#FAFAF7] px-3 py-2.5 text-[12.5px] text-[#1B1B18] focus:border-[#2F4B3C] focus:outline-none disabled:opacity-60"
                  >
                    {postCategories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(event) =>
                      setTagsInput(event.target.value)
                    }
                    placeholder="tags, comma separated"
                    disabled={publishing}
                    className="w-full min-w-0 rounded-xl border border-[#E6E3DA] bg-transparent px-3 py-2.5 text-[12.5px] text-[#1B1B18] placeholder:text-[#A6A192] focus:border-[#2F4B3C] focus:outline-none disabled:opacity-60"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#E6E3DA] bg-[#F3F0E9] px-3 py-2 text-[12px] leading-5 text-[#7A2E2E]"
                  >
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <span className="text-[11px] text-[#A6A192]">
                    ~
                    {Math.max(
                      1,
                      Math.ceil(
                        content
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean).length / 200
                      )
                    )}{" "}
                    min read
                  </span>

                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing}
                    className="rounded-full bg-[#1B1B18] px-4 py-1.5 text-[12.5px] font-medium text-[#FAFAF7] transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {publishing
                      ? "Publishing…"
                      : "Publish"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav
          aria-label="Primary"
          className="border-t border-[#E6E3DA] bg-[#FAFAF7]/95 backdrop-blur"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <ul className="mx-auto grid max-w-[720px] grid-cols-4">
            {tabs.map(({ id, label, Icon }) => {
              const isActive = id === active;

              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => handleTabTap(id)}
                    aria-current={
                      isActive ? "true" : undefined
                    }
                    aria-label={label}
                    className="flex w-full flex-col items-center gap-1 py-3 transition-transform duration-150 active:scale-90"
                  >
                    <Icon
                      className={`h-[22px] w-[22px] transition-colors duration-150 ${
                        isActive
                          ? "text-[#1B1B18]"
                          : "text-[#A6A192]"
                      }`}
                    />

                    <span
                      className={`h-1 w-1 rounded-full transition-colors duration-150 ${
                        isActive
                          ? "bg-[#2F4B3C]"
                          : "bg-transparent"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}