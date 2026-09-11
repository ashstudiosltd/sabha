"use client";

import type { Category } from "@/data/blog";

interface CategoryListProps {
  categoriesList: Category[];
  active: Category;
  onSelect: (category: Category) => void;
  variant?: "pills" | "list";
}

export default function CategoryList({
  categoriesList,
  active,
  onSelect,
  variant = "pills",
}: CategoryListProps) {
  if (variant === "list") {
    return (
      <nav aria-label="Explore categories">
        <ul className="space-y-0.5">
          {categoriesList.map((category) => {
            const isActive = category === active;
            return (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => onSelect(category)}
                  className={`w-full rounded-sm px-2.5 py-1.5 text-left text-[13.5px] transition-all duration-150 active:scale-[0.97] ${
                    isActive
                      ? "bg-[#EEEDE5] font-medium text-[#1B1B18]"
                      : "text-[#5B5748] hover:bg-[#F2F1EA] hover:text-[#1B1B18]"
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
      <ul className="flex items-center gap-1 px-1">
        {categoriesList.map((category) => {
          const isActive = category === active;
          return (
            <li key={category} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(category)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] transition-all duration-150 active:scale-95 ${
                  isActive
                    ? "bg-[#1B1B18] text-[#FAFAF7]"
                    : "text-[#5B5748] hover:bg-[#F2F1EA]"
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