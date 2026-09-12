"use client";
import type { ReactNode } from "react";
import type { BlogPost, Category, TrendingItem } from "@/data/blog";
import { categories, tags } from "@/data/blog";
import CategoryList from "./categorylist";
import TrendingBlogs from "./trendingblog";
interface BlogSidebarProps {
  active: Category;
  onSelect: (category: Category) => void;
  posts: BlogPost[];
}
function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-[11.5px] font-medium tracking-[0.08em] text-[#F5F3EC]/50">
        {title}
      </h2>
      {children}
    </section>
  );
}
export default function BlogSidebar({
  active,
  onSelect,
  posts,
}: BlogSidebarProps) {
  const trendingBlogs: TrendingItem[] = [...posts]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5)
    .map((post) => ({
      id: post.id,
      title: post.title,
      authorName: post.author.name,
      date: post.date,
    }));
  return (
    <aside className="hidden bg-transparent lg:sticky lg:top-8 lg:block lg:space-y-9">
      <SidebarSection title="Explore">
        <CategoryList
          categoriesList={categories}
          active={active}
          onSelect={onSelect}
          variant="list"
        />
      </SidebarSection>
      <div className="border-t border-white/10" />
      <SidebarSection title="Popular this week">
        <TrendingBlogs items={trendingBlogs} />
      </SidebarSection>
      <div className="border-t border-white/10" />
      <SidebarSection title="Tags">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <a
              key={tag}
              href="#"
              className="rounded-full border border-white/10 bg-transparent px-2.5 py-1 text-[12px] text-[#F5F3EC]/70 transition-all duration-150 active:scale-95 hover:border-[#8FBBA0] hover:text-[#8FBBA0]"
            >
              #{tag}
            </a>
          ))}
        </div>
      </SidebarSection>
    </aside>
  );
}