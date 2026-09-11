"use client";

import { useMemo, useState } from "react";
import type { BlogPost, Category } from "@/data/blog";
import { blogPosts } from "@/data/blog";
import BlogFeed from "./blogsfeed";
import BlogSidebar from "./blogsidebar";
import MobileBottomNav from "./mobileBottomnav";
import BlogDetailModal from "./blogdetailmodal";

// Top-level page for the Devvrats "Blogs by Members" section.
// Pure UI: filtering/search only narrow the static mock array on the client,
// there is no fetch, auth, or persistence involved anywhere in this tree.
export default function BlogsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return blogPosts.filter((post) => {
      const matchesCategory =
        activeCategory === "All" || post.category === activeCategory;

      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        post.title,
        post.excerpt,
        post.author.name,
        post.author.username,
        ...post.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeCategory, query]);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#1B1B18]">
      {/* Reserved space for the site navbar (built separately). Remove the
          fixed height here once a real navbar occupies this space. */}
      <div className="h-16 lg:h-20" aria-hidden="true" />

      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pb-14 lg:pt-10">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main>
            <BlogFeed
              posts={filteredPosts}
              query={query}
              onQueryChange={setQuery}
              onOpenPost={setSelectedPost}
            />
          </main>

          <BlogSidebar active={activeCategory} onSelect={setActiveCategory} />
        </div>
      </div>

      <MobileBottomNav query={query} onQueryChange={setQuery} />

      <BlogDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
}