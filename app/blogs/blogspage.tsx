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

import MobileBottomNav from "./Bottomnav";

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

  /*

   * Load posts

   */

  const loadPosts = useCallback(async () => {

    setLoading(true);

    const data = await getBlogPosts();

    setPosts(data);

    setLoading(false);

  }, []);

  /*

   * Load currently signed-in user

   */

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

  /*

   * Initial posts load

   */

  useEffect(() => {

    loadPosts();

  }, [loadPosts]);

  /*

   * Delete post

   */

  const handleDeletePost = async (

    postId: string

  ) => {

    const result = await deleteBlogPost(postId);

    if (result.error) {

      window.alert(result.error);

      return;

    }

    setSelectedPost(null);

    await loadPosts();

  };

  /*

   * Search + category filtering

   */

  const filteredPosts = useMemo(() => {

    const normalizedQuery =

      query.trim().toLowerCase();

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

    <div className="min-h-screen bg-[#FAFAF7] text-[#1B1B18]">

      {/* Top spacing for existing site navigation */}

      <div

        className="h-16 lg:h-20"

        aria-hidden="true"

      />

      {/* Main content */}

      <div className="mx-auto max-w-[1180px] px-5 pb-28 pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_280px]">

          <main>

            {loading ? (

              <div className="py-16 text-center text-sm text-[#8A8577]">

                Loading posts...

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

      {/* Bottom navigation + composer */}

      <MobileBottomNav

        query={query}

        onQueryChange={setQuery}

        onPostCreated={loadPosts}

      />

      {/* Full post modal */}

      <BlogDetailModal

        post={selectedPost}

        onClose={() => setSelectedPost(null)}

        onDelete={handleDeletePost}

        canDelete={

          selectedPost?.authorId === currentUserId

        }

      />

    </div>

  );

}