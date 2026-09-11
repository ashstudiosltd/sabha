"use client";

import type { ReactNode } from "react";
import type { Category, TrendingItem } from "@/data/blog";
import { categories, tags, trendingBlogs } from "@/data/blog";
import CategoryList from "./categorylist";
import TrendingBlogs from "./trendingblog";

interface BlogSidebarProps {
  active: Category;
  onSelect: (category: Category) => void;
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
      <h2 className="mb-3 text-[11.5px] font-medium tracking-[0.08em] text-[#8A8577]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function BlogSidebar({ active, onSelect }: BlogSidebarProps) {
  return (
    // Sidebar is a desktop/tablet-and-up affair. On mobile its job is taken
    // over by the bottom icon nav (Explore/Search), so Popular and Tags are
    // dropped rather than stacked underneath the feed.
    <aside className="hidden lg:sticky lg:top-8 lg:block lg:space-y-9">
      <SidebarSection title="Explore">
        <CategoryList
          categoriesList={categories}
          active={active}
          onSelect={onSelect}
          variant="list"
        />
      </SidebarSection>

      <div className="border-t border-[#E6E3DA]" />

      <SidebarSection title="Popular this week">
        <TrendingBlogs items={trendingBlogs as TrendingItem[]} />
      </SidebarSection>

      <div className="border-t border-[#E6E3DA]" />

      <SidebarSection title="Tags">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <a
              key={tag}
              href="#"
              className="rounded-full border border-[#E6E3DA] px-2.5 py-1 text-[12px] text-[#6E6A5F] transition-all duration-150 active:scale-95 hover:border-[#2F4B3C] hover:text-[#2F4B3C]"
            >
              #{tag}
            </a>
          ))}
        </div>
      </SidebarSection>
    </aside>
  );
}