"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BlogPost, Category } from "@/data/blog";
import {
  deleteBlogPost,
  getBlogPosts,
} from "@/lib/supabase/blog";
import { createClient } from "@/lib/supabase/client";
import BlogFeed from "./blogsfeed";
import BlogSidebar from "./blogsidebar";
import BlogNavbar from "./blognav";

import BlogDetailModal from "./blogdetailmodal";

export default function BlogsPage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<Category>("All");
  const [query, setQuery] = useState("");
  const [selectedPost, setSelectedPost] =
    useState<BlogPost | null>(null);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const data = await getBlogPosts();
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) {
        setCurrentUserId(user?.id ?? null);
      }
    };
    loadUser();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDeletePost = async (postId: string) => {
    const result = await deleteBlogPost(postId);
    if (result.error) {
      window.alert(result.error);
      return;
    }
    setSelectedPost(null);
    await loadPosts();
  };

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory =
        activeCategory === "All" ||
        post.category === activeCategory;
      if (!matchesCategory) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
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
  }, [posts, activeCategory, query]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#1d1d1f]">
      <div
        className="h-16 bg-[#f5f5f7] lg:h-20"
        aria-hidden="true"
      />

      <BlogNavbar query={query} onQueryChange={setQuery} />

      <div className="mx-auto max-w-[1180px] px-5 pb-28 pt-10 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
        <h1 className="mb-10 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1d1d1f] sm:text-[56px]">
          Blogs
        </h1>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main>
            {loading ? (
              <div className="space-y-4 py-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-[18px] border-l-[8px] border-l-[#d2d2d7] bg-white"
                  />
                ))}
              </div>
            ) : (
              <BlogFeed
                posts={filteredPosts}
                query={query}
                onQueryChange={setQuery}
                onOpenPost={setSelectedPost}
              />
            )}
          </main>

          <BlogSidebar
            active={activeCategory}
            onSelect={setActiveCategory}
            posts={posts}
          />
        </div>
      </div>

      <BlogDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onDelete={handleDeletePost}
        canDelete={selectedPost?.authorId === currentUserId}
      />
    </div>
  );
}