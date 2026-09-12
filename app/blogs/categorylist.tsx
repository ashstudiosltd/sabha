"use client";

import { useEffect, useRef, useState } from "react";

import type { Category } from "@/data/blog";

interface CategoryListProps {
  categoriesList: Category[];
  active: Category;
  onSelect: (category: Category) => void;
  variant?: "pills" | "list";
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function CategoryList({
  categoriesList,
  active,
  onSelect,
  variant = "pills",
}: CategoryListProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);

  const measure = () => {
    const node = itemRefs.current[active];
    if (!node) return;

    setHighlight({
      top: node.offsetTop,
      left: node.offsetLeft,
      width: node.offsetWidth,
      height: node.offsetHeight,
    });
  };

  useEffect(() => {
    measure();

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, variant, categoriesList]);

  if (variant === "list") {
    return (
      <nav aria-label="Explore categories">
        <ul className="relative space-y-0.5">
          {highlight && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 rounded-md border border-[#8FBBA0]/30 bg-gradient-to-r from-[#8FBBA0]/25 via-[#8FBBA0]/10 to-transparent backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu will-change-transform"
              style={{
                top: highlight.top,
                width: highlight.width,
                height: highlight.height,
              }}
            />
          )}

          {categoriesList.map((category) => {
            const isActive = category === active;
            return (
              <li key={category} className="relative">
                <button
                  ref={(node) => {
                    itemRefs.current[category] = node;
                  }}
                  type="button"
                  onClick={() => onSelect(category)}
                  className={`relative z-10 w-full rounded-md bg-transparent px-2.5 py-1.5 text-left text-[13.5px] transition-colors duration-300 active:scale-[0.97] ${
                    isActive
                      ? "font-medium text-[#F5F3EC]"
                      : "text-[#F5F3EC]/50 hover:text-[#F5F3EC]"
                  }`}
                >
                  {category}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Filter blogs by category" className="-mx-1 overflow-x-auto">
      <ul className="relative flex items-center gap-1 px-1">
        {highlight && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full bg-gradient-to-r from-[#F5F3EC] to-[#F5F3EC]/95 shadow-[0_2px_16px_rgba(0,0,0,0.4)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu will-change-transform"
            style={{
              top: highlight.top,
              left: highlight.left,
              width: highlight.width,
              height: highlight.height,
            }}
          />
        )}

        {categoriesList.map((category) => {
          const isActive = category === active;
          return (
            <li key={category} className="relative shrink-0">
              <button
                ref={(node) => {
                  itemRefs.current[category] = node;
                }}
                type="button"
                onClick={() => onSelect(category)}
                className={`relative z-10 rounded-full bg-transparent px-3.5 py-1.5 text-[13px] transition-colors duration-300 active:scale-95 ${
                  isActive
                    ? "text-[#141412]"
                    : "text-[#F5F3EC]/60 hover:text-[#F5F3EC]"
                }`}
              >
                {category}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}