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
      {/* Category filtering now lives only in the sidebar's Explore list
          (desktop/tablet) — the duplicate pill row above the feed was
          removed. */}

      <div className="mt-6 bg-transparent">
        {posts.length > 0 ? (
          <div className="flex flex-col gap-4 bg-transparent">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} onOpen={onOpenPost} />
            ))}
          </div>
        ) : (
         <div className="rounded-xl border border-[#E5E1D8] bg-white py-16 text-center">
            <p className="font-serif text-[18px] text-[#1D1D1F]">No posts match yet</p>
            <p className="mt-1.5 text-[13.5px] text-[#1D1D1F]/50">
              Try a different category or search term.
            </p>
          </div>
        )}
      </div>

      {posts.length > 0 && (
        <div className="flex justify-center pt-10">
          <button
            type="button"
            className="rounded-full border border-[#E5E1D8] bg-white px-5 py-2 text-[13px] text-[#1D1D1F]/60 transition-all duration-150 active:scale-95 hover:border-[#1D1D1F]/25 hover:text-[#1D1D1F]"
          >
            Load more posts
          </button>
        </div>
      )}
    </div>
  );
}