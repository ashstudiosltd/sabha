"use client";

import { useEffect, useRef, useState } from "react";
import { GridDotsIcon, SearchIcon, PlusIcon, ProfileIcon, CloseIcon } from "./icons";

type Tab = "feed" | "search" | "post" | "profile";

interface MobileBottomNavProps {
  query: string;
  onQueryChange: (query: string) => void;
}

const tabs: { id: Tab; label: string; Icon: typeof GridDotsIcon }[] = [
  { id: "feed", label: "Feed", Icon: GridDotsIcon },
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "post", label: "New post", Icon: PlusIcon },
  { id: "profile", label: "Profile", Icon: ProfileIcon },
];

// Instagram-style fixed bottom bar, shown only below the lg breakpoint.
// Tapping Search or New Post expands a pill directly above the bar — the
// same "grows out of the nav" motion for both, just different contents.
// Everything else (Feed, Profile) is a static, cosmetic tab.
export default function MobileBottomNav({ query, onQueryChange }: MobileBottomNavProps) {
  const [active, setActive] = useState<Tab>("feed");
  const [expanded, setExpanded] = useState<"search" | "post" | null>(null);
  const [draft, setDraft] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded === "search") {
      const raf = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [expanded]);

  const closeExpanded = () => setExpanded(null);

  const handleTabTap = (tab: Tab) => {
    if (tab === "search" || tab === "post") {
      setActive(tab);
      setExpanded((current) => (current === tab ? null : tab));
      return;
    }
    setActive(tab);
    setExpanded(null);
  };

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-30 transition-opacity duration-200"
          onClick={closeExpanded}
          aria-hidden="true"
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {/* Expanding pill — grows up out of the nav bar for both Search and
            New post, sharing one motion so the two feel like the same idea. */}
        <div
          className={`px-4 pb-3 transition-all duration-[220ms] ease-out ${
            expanded
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0"
          }`}
          style={{ transformOrigin: "bottom center" }}
        >
          {expanded === "search" && (
            <div className="flex items-center gap-2 rounded-full border border-[#E6E3DA] bg-[#FAFAF7] px-4 py-2.5 shadow-lg">
              <SearchIcon className="h-[17px] w-[17px] shrink-0 text-[#8A8577]" />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search posts, tags, authors"
                className="w-full bg-transparent text-[14px] text-[#1B1B18] placeholder:text-[#A6A192] focus:outline-none"
              />
              <button
                type="button"
                onClick={closeExpanded}
                aria-label="Close search"
                className="shrink-0 rounded-full p-1 text-[#8A8577] transition-transform duration-150 active:scale-90"
              >
                <CloseIcon className="h-[15px] w-[15px]" />
              </button>
            </div>
          )}

          {expanded === "post" && (
            <div className="rounded-2xl border border-[#E6E3DA] bg-[#FAFAF7] p-3 shadow-lg">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[12.5px] font-medium text-[#1B1B18]">New post</span>
                <button
                  type="button"
                  onClick={closeExpanded}
                  aria-label="Close composer"
                  className="rounded-full p-1 text-[#8A8577] transition-transform duration-150 active:scale-90"
                >
                  <CloseIcon className="h-[15px] w-[15px]" />
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Share what you're building or learned today…"
                rows={3}
                className="w-full resize-none rounded-xl border border-[#E6E3DA] bg-transparent p-2.5 text-[13.5px] text-[#1B1B18] placeholder:text-[#A6A192] focus:border-[#2F4B3C] focus:outline-none"
              />
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDraft("");
                    closeExpanded();
                  }}
                  className="rounded-full bg-[#1B1B18] px-4 py-1.5 text-[12.5px] font-medium text-[#FAFAF7] transition-transform duration-150 active:scale-95"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>

        <nav
          aria-label="Primary"
          className="border-t border-[#E6E3DA] bg-[#FAFAF7]/95 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="grid grid-cols-4">
            {tabs.map(({ id, label, Icon }) => {
              const isActive = id === active;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => handleTabTap(id)}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={label}
                    className="flex w-full flex-col items-center gap-1 py-3 transition-transform duration-150 active:scale-90"
                  >
                    <Icon
                      className={`h-[22px] w-[22px] transition-colors duration-150 ${
                        isActive ? "text-[#1B1B18]" : "text-[#A6A192]"
                      }`}
                    />
                    <span
                      className={`h-1 w-1 rounded-full transition-colors duration-150 ${
                        isActive ? "bg-[#2F4B3C]" : "bg-transparent"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}