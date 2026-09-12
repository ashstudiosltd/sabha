"use client";

import type { BlogPost } from "@/data/blog";
import BlogCard from "./blogcard";
import { SearchIcon } from "./icons";

interface BlogFeedProps {
  posts: BlogPost[];
  query: string;
  onQueryChange: (query: string) => void;
  onOpenPost: (post: BlogPost) => void;
}

export default function BlogFeed({ posts, query, onQueryChange, onOpenPost }: BlogFeedProps) {
  return (
    <div className="bg-transparent">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[32px] leading-tight text-[#F5F3EC] sm:text-[38px]">
            Blogs by members
          </h1>
        </div>

        {/* Search collapses on mobile — the bottom nav's search tab covers
            that job there; the full input returns at the lg breakpoint. */}
        <label className="relative hidden w-full sm:w-64 lg:block">
          <span className="sr-only">Search blogs</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F3EC]/50" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search posts, tags, authors"
            className="w-full rounded-full border border-white/10 bg-transparent py-2 pl-9 pr-3.5 text-[13.5px] text-[#F5F3EC] placeholder:text-[#F5F3EC]/40 focus:border-[#8FBBA0] focus:outline-none"
          />
        </label>
      </div>

      {/* Category filtering now lives only in the sidebar's Explore list
          (desktop/tablet) — the duplicate pill row above the feed was
          removed. */}

      <div className="mt-6 bg-transparent">
        {posts.length > 0 ? (
          <div className="bg-transparent">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} onOpen={onOpenPost} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="font-serif text-[18px] text-[#F5F3EC]">No posts match yet</p>
            <p className="mt-1.5 text-[13.5px] text-[#F5F3EC]/50">
              Try a different category or search term.
            </p>
          </div>
        )}
      </div>

      {posts.length > 0 && (
        <div className="flex justify-center pt-10">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-transparent px-5 py-2 text-[13px] text-[#F5F3EC]/60 transition-all duration-150 active:scale-95 hover:border-white/30 hover:text-[#F5F3EC]"
          >
            Load more posts
          </button>
        </div>
      )}
    </div>
  );
}