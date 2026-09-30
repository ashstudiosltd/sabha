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
      <h2 className="mb-2.5 text-[11.5px] font-medium tracking-[0.08em] text-black">
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
    <aside className="hidden bg-transparent lg:sticky lg:top-8 lg:block lg:space-y-5">
      <SidebarSection title="Explore">
        <CategoryList
          categoriesList={categories}
          active={active}
          onSelect={onSelect}
          variant="list"
        />
      </SidebarSection>
      <div className="border-t border-[#E5E1D8]" />
      <SidebarSection title="Popular this week">
        <TrendingBlogs items={trendingBlogs} />
      </SidebarSection>
      <div className="border-t border-[#E5E1D8]" />
      <SidebarSection title="Tags">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <a
              key={tag}
              href="#"
              className="rounded-full border border-[#E5E1D8] bg-white px-2.5 py-1 text-[12px] text-black transition-all duration-150 active:scale-95 hover:border-grey hover:text-grey"
            >
              #{tag}
            </a>
          ))}
        </div>
      </SidebarSection>
    </aside>
  );
}