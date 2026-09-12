"use client";

import { useEffect, useRef, useState } from "react";

import {
  GridDotsIcon,
  SearchIcon,
  PlusIcon,
  CloseIcon,
} from "./icons";

import {
  createBlogPost,
  type PostCategory,
} from "@/lib/supabase/blog";

import { createClient } from "@/lib/supabase/client";

import ProfileQuickCard from "@/app/components/ProfileQuickCard";

type Tab = "feed" | "search" | "post" | "profile";

type ExpandedPanel =
  | "search"
  | "post"
  | "profile"
  | null;

interface MobileBottomNavProps {
  query: string;
  onQueryChange: (query: string) => void;
  onPostCreated: () => Promise<void>;
}

interface CurrentProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

const tabs: {
  id: Tab;
  label: string;
}[] = [
  { id: "feed", label: "Feed" },
  { id: "search", label: "Search" },
  { id: "post", label: "New post" },
  { id: "profile", label: "Profile" },
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
  const supabase = createClient();

  const [active, setActive] =
    useState<Tab>("feed");

  const [expanded, setExpanded] =
    useState<ExpandedPanel>(null);

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const titleInputRef =
    useRef<HTMLInputElement>(null);

  const [profile, setProfile] =
    useState<CurrentProfile | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");

  const [category, setCategory] =
    useState<PostCategory>("Ideas");

  const [tagsInput, setTagsInput] =
    useState("");

  const [publishing, setPublishing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Load current user's profile.
   */

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        return;
      }

      const { data, error } =
        await supabase
          .from("profiles")
          .select(`
            id,
            username,
            name,
            avatar_url
          `)
          .eq("id", user.id)
          .maybeSingle();

      if (error) {
        console.error(
          "Error loading bottom nav profile:",
          error
        );

        return;
      }

      if (!mounted || !data) {
        return;
      }

      setProfile({
        id: data.id,
        username: data.username,
        name: data.name,
        avatarUrl: data.avatar_url,
      });
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /*
   * Focus expanded inputs.
   */

  useEffect(() => {
    if (expanded === "search") {
      const raf = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });

      return () =>
        cancelAnimationFrame(raf);
    }

    if (expanded === "post") {
      const raf = requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });

      return () =>
        cancelAnimationFrame(raf);
    }
  }, [expanded]);

  /*
   * Close expanded panel.
   */

  const closeExpanded = () => {
    if (publishing) return;

    setExpanded(null);
    setError(null);
  };

  /*
   * Reset composer.
   */

  const resetComposer = () => {
    setTitle("");
    setExcerpt("");
    setContent("");
    setCategory("Ideas");
    setTagsInput("");
    setError(null);
  };

  /*
   * Handle navigation.
   */

  const handleTabTap = async (tab: Tab) => {
    /*
     * Profile
     */

    if (tab === "profile") {
      setActive("profile");
      setError(null);

      if (!profile?.username) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setExpanded(null);
          return;
        }

        const {
          data: currentProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            username,
            name,
            avatar_url
          `)
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Error loading current profile:",
            profileError
          );

          return;
        }

        if (!currentProfile?.username) {
          console.error(
            "Current user does not have a profile username."
          );

          return;
        }

        setProfile({
          id: currentProfile.id,
          username: currentProfile.username,
          name: currentProfile.name,
          avatarUrl:
            currentProfile.avatar_url,
        });

        setExpanded((current) =>
          current === "profile"
            ? null
            : "profile"
        );

        return;
      }

      setExpanded((current) =>
        current === "profile"
          ? null
          : "profile"
      );

      return;
    }

    /*
     * Search and New Post
     */

    if (
      tab === "search" ||
      tab === "post"
    ) {
      setActive(tab);
      setError(null);

      setExpanded((current) =>
        current === tab ? null : tab
      );

      return;
    }

    /*
     * Feed
     */

    setActive("feed");
    setExpanded(null);
    setError(null);
  };

  /*
   * Publish post.
   */

  const handlePublish = async () => {
    if (publishing) return;

    setError(null);

    const cleanTitle =
      title.trim();

    const cleanExcerpt =
      excerpt.trim();

    const cleanContent =
      content.trim();

    if (cleanTitle.length < 3) {
      setError(
        "Title must be at least 3 characters."
      );

      return;
    }

    if (cleanTitle.length > 140) {
      setError(
        "Title must be 140 characters or less."
      );

      return;
    }

    if (cleanExcerpt.length < 10) {
      setError(
        "Excerpt must be at least 10 characters."
      );

      return;
    }

    if (cleanExcerpt.length > 300) {
      setError(
        "Excerpt must be 300 characters or less."
      );

      return;
    }

    if (cleanContent.length < 20) {
      setError(
        "Write a little more before publishing."
      );

      return;
    }

    const paragraphs =
      cleanContent
        .split(/\n\s*\n/)
        .map((paragraph) =>
          paragraph.trim()
        )
        .filter(Boolean);

    if (paragraphs.length === 0) {
      setError(
        "Post content cannot be empty."
      );

      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) =>
        tag.trim().toLowerCase()
      )
      .filter(Boolean)
      .filter(
        (tag, index, array) =>
          array.indexOf(tag) === index
      );

    if (tags.length > 10) {
      setError(
        "You can add up to 10 tags."
      );

      return;
    }

    if (
      tags.some(
        (tag) => tag.length > 30
      )
    ) {
      setError(
        "Each tag must be 30 characters or less."
      );

      return;
    }

    const wordCount =
      paragraphs
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;

    const readTime = Math.max(
      1,
      Math.ceil(wordCount / 200)
    );

    setPublishing(true);

    const result =
      await createBlogPost({
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

  const isExpanded =
    expanded !== null;

  return (
    <>
      {/* Backdrop */}

      {isExpanded && (
        <div
          className="fixed inset-0 z-30 bg-transparent transition-opacity duration-200"
          onClick={closeExpanded}
          aria-hidden="true"
        />
      )}

      {/* Bottom navigation shell */}

      <div className="fixed inset-x-0 bottom-0 z-40">
        {/* Expanded panels */}

        <div
          className={`mx-auto w-full max-w-[720px] px-4 pb-3 transition-all duration-[220ms] ease-out transform-gpu will-change-transform ${
            isExpanded
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0"
          }`}
          style={{
            transformOrigin:
              "bottom center",
          }}
        >
          {/* Search */}

          {expanded === "search" && (
            <div className="relative flex items-center gap-2 overflow-hidden rounded-full border border-white/30 bg-white/10 px-4 py-2.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.5)] backdrop-blur-2xl backdrop-saturate-150">
              {/* specular sheen */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/[0.04] to-transparent" />

              <SearchIcon className="relative z-10 h-[17px] w-[17px] shrink-0 text-white drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />

              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) =>
                  onQueryChange(
                    event.target.value
                  )
                }
                placeholder="Search posts, tags, authors"
                className="relative z-10 w-full bg-transparent text-[14px] font-medium text-white placeholder:text-white/70 focus:outline-none"
              />

              <button
                type="button"
                onClick={closeExpanded}
                aria-label="Close search"
                className="relative z-10 shrink-0 rounded-full p-1 text-white transition-transform duration-150 ease-out transform-gpu hover:bg-white/20 active:scale-90"
              >
                <CloseIcon className="h-[15px] w-[15px]" />
              </button>
            </div>
          )}

          {/* New post */}

          {expanded === "post" && (
            <div className="relative max-h-[78vh] overflow-y-auto rounded-2xl border border-white/30 bg-white/10 p-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.5)] backdrop-blur-2xl backdrop-saturate-150 sm:p-4">
              {/* specular sheen */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-white/[0.03] to-transparent" />

              <div className="relative z-10 flex items-center justify-between px-1 pb-2">
                <span className="text-[12.5px] font-semibold text-white drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                  New post
                </span>

                <button
                  type="button"
                  onClick={closeExpanded}
                  disabled={publishing}
                  aria-label="Close composer"
                  className="rounded-full p-1 text-white transition-transform duration-150 ease-out transform-gpu hover:bg-white/20 active:scale-90 disabled:opacity-40"
                >
                  <CloseIcon className="h-[15px] w-[15px]" />
                </button>
              </div>

              <div className="relative z-10 space-y-2.5">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Post title"
                  maxLength={140}
                  disabled={publishing}
                  className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-[14px] font-medium text-white placeholder:text-white/70 backdrop-blur-md transition-colors duration-150 focus:border-white/60 focus:bg-white/20 focus:outline-none disabled:opacity-60"
                />

                <textarea
                  value={excerpt}
                  onChange={(event) =>
                    setExcerpt(
                      event.target.value
                    )
                  }
                  placeholder="A short description of your post…"
                  maxLength={300}
                  rows={2}
                  disabled={publishing}
                  className="w-full resize-none rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-[13.5px] text-white placeholder:text-white/70 backdrop-blur-md transition-colors duration-150 focus:border-white/60 focus:bg-white/20 focus:outline-none disabled:opacity-60"
                />

                <textarea
                  value={content}
                  onChange={(event) =>
                    setContent(
                      event.target.value
                    )
                  }
                  placeholder="Write your post…"
                  rows={6}
                  disabled={publishing}
                  className="w-full resize-none rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-[13.5px] leading-6 text-white placeholder:text-white/70 backdrop-blur-md transition-colors duration-150 focus:border-white/60 focus:bg-white/20 focus:outline-none disabled:opacity-60"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target
                          .value as PostCategory
                      )
                    }
                    disabled={publishing}
                    className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-[12.5px] text-white placeholder:text-white/70 backdrop-blur-md transition-colors duration-150 focus:border-white/60 focus:bg-white/20 focus:outline-none disabled:opacity-60"
                  >
                    {postCategories.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>

                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(event) =>
                      setTagsInput(
                        event.target.value
                      )
                    }
                    placeholder="tags, comma separated"
                    disabled={publishing}
                    className="w-full min-w-0 rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-[12.5px] text-white placeholder:text-white/70 backdrop-blur-md transition-colors duration-150 focus:border-white/60 focus:bg-white/20 focus:outline-none disabled:opacity-60"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-[12px] leading-5 text-[#7A2E2E] backdrop-blur-md"
                  >
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <span className="text-[11px] text-[#5B5748]/80">
                    ~
                    {Math.max(
                      1,
                      Math.ceil(
                        content
                          .trim()
                          .split(/\s+/)
                          .filter(
                            Boolean
                          ).length /
                          200
                      )
                    )}{" "}
                    min read
                  </span>

                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing}
                    className="relative overflow-hidden rounded-full border border-white/20 bg-[#1B1B18]/80 px-4 py-1.5 text-[12.5px] font-medium text-[#FAFAF7] backdrop-blur-md transition-all duration-150 ease-out transform-gpu active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                    <span className="relative z-10">
                      {publishing
                        ? "Publishing…"
                        : "Publish"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile */}

          {expanded === "profile" &&
            profile?.username && (
              <ProfileQuickCard
                username={profile.username}
                onClose={closeExpanded}
              />
            )}
        </div>

        {/* Navigation */}

        <nav
          aria-label="Primary"
          className="relative overflow-hidden border-t border-white/20 bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150"
          style={{
            paddingBottom:
              "env(safe-area-inset-bottom)",
          }}
        >
          {/* specular sheen across the whole bar */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-white/[0.02] to-transparent" />

          <ul className="relative z-10 mx-auto grid max-w-[720px] grid-cols-4">
            {tabs.map(
              ({ id, label }) => {
                const isActive =
                  id === active;

                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() =>
                        handleTabTap(id)
                      }
                      aria-current={
                        isActive
                          ? "true"
                          : undefined
                      }
                      aria-label={label}
                      className="group relative flex w-full flex-col items-center gap-1 py-3 transition-transform duration-150 ease-out transform-gpu active:scale-90"
                    >
                      {/* glow pill behind the active icon — transform/opacity only, GPU friendly */}
                      <span
                        aria-hidden="true"
                        className={`absolute top-1 h-8 w-8 rounded-full bg-gradient-to-br from-white/70 to-white/10 blur-md transition-all duration-300 ease-out transform-gpu will-change-transform ${
                          isActive
                            ? "scale-100 opacity-100"
                            : "scale-50 opacity-0 group-hover:scale-75 group-hover:opacity-50"
                        }`}
                      />

                      {id === "profile" ? (
                        <div
                          className={`relative z-10 h-[22px] w-[22px] overflow-hidden rounded-full border border-white/40 transition-all duration-150 ease-out transform-gpu ${
                            isActive
                              ? "ring-2 ring-white/70 ring-offset-2 ring-offset-transparent"
                              : ""
                          }`}
                        >
                          {profile?.avatarUrl ? (
                            <img
                              src={
                                profile.avatarUrl
                              }
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : profile ? (
                            <div className="flex h-full w-full items-center justify-center bg-[#2F4B3C]/80 text-[9px] font-medium text-[#FAFAF7] backdrop-blur-md">
                              {profile.name
                                .trim()
                                .slice(
                                  0,
                                  1
                                )
                                .toUpperCase()}
                            </div>
                          ) : (
                            <div className="h-full w-full animate-pulse bg-white/20" />
                          )}
                        </div>
                      ) : id === "feed" ? (
                        <GridDotsIcon
                          className={`relative z-10 h-[22px] w-[22px] transition-colors duration-150 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] ${
                            isActive
                              ? "text-white"
                              : "text-[#5B5748]/70"
                          }`}
                        />
                      ) : id === "search" ? (
                        <SearchIcon
                          className={`relative z-10 h-[22px] w-[22px] transition-colors duration-150 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] ${
                            isActive
                              ? "text-white"
                              : "text-[#5B5748]/70"
                          }`}
                        />
                      ) : (
                        <PlusIcon
                          className={`relative z-10 h-[22px] w-[22px] transition-colors duration-150 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] ${
                            isActive
                              ? "text-white"
                              : "text-[#5B5748]/70"
                          }`}
                        />
                      )}

                      <span
                        className={`relative z-10 h-1 w-1 rounded-full transition-all duration-150 ease-out transform-gpu ${
                          isActive
                            ? "scale-100 bg-[#2F4B3C] opacity-100"
                            : "scale-0 bg-transparent opacity-0"
                        }`}
                      />
                    </button>
                  </li>
                );
              }
            )}
          </ul>
        </nav>
      </div>
    </>
  );
}