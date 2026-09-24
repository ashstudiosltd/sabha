"use client";
import type { BlogPost } from "@/data/blog";
import BlogCard from "./blogcard";

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

      <div className="bg-transparent">
        {posts.length > 0 ? (
          <div className="flex flex-col gap-4 bg-transparent">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} onOpen={onOpenPost} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E1D8] bg-white py-12 text-center">
            <p className="text-[18px] text-[#1D1D1F]">No posts match yet</p>
            <p className="mt-1.5 text-[13.5px] text-[#1D1D1F]/50">
              Try a different category or search term.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}