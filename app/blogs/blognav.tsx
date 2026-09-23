"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUser, Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

interface BlogNavbarProps {
  query: string;
  onQueryChange: (value: string) => void;
}

interface CurrentProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export default function BlogNavbar({
  query,
  onQueryChange,
}: BlogNavbarProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Load current profile */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error("Error loading navbar profile:", error);
        return;
      }
      if (data) {
        setProfile({
          id: data.id,
          username: data.username,
          name: data.name,
          avatarUrl: data.avatar_url,
        });
      }
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  /* Close popup on outside click / Escape */
  useEffect(() => {
    if (!menuOpen) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* Focus mobile search */
  useEffect(() => {
    if (!searchOpen) return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [searchOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/blogs");
    router.refresh();
  };

  const linkClass =
    "text-[15px] text-[#1d1d1f] transition-colors hover:text-[#0066cc]";
  const itemClass =
    "block w-full px-4 py-2.5 text-left text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7]";
  const inputClass =
    "h-full w-full rounded-[12px] border border-[#d2d2d7] bg-white pl-11 pr-4 text-[16px] text-[#1d1d1f] outline-none transition-colors placeholder:text-[#6e6e73] focus:border-[#0071e3]";

  return (
    <div className="sticky top-0 z-40 border-b border-[#d2d2d7] bg-white font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <div className="mx-auto flex h-[70px] max-w-[1180px] items-center gap-4 px-5 sm:gap-6 sm:px-8 lg:px-10">
        {/* Title */}
        <Link
          href="/blogs"
          className="shrink-0 text-[24px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[28px]"
        >
          Blogs
        </Link>

        {/* Search (sm and up) */}
        <div className="relative ml-2 hidden h-[46px] w-full max-w-[560px] items-center sm:flex">
          <Search className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-[#6e6e73]" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search for a topic, subtopic, or tag"
            aria-label="Search blogs"
            className={inputClass}
          />
        </div>

        {/* Links */}
        <div className="ml-auto flex items-center gap-5">
          {/* Search toggle (below sm) */}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            className="text-[#1d1d1f] sm:hidden"
          >
            {searchOpen ? (
              <X className="h-[22px] w-[22px]" />
            ) : (
              <Search className="h-[22px] w-[22px]" />
            )}
          </button>

          {/* Desktop links */}
          <Link href="/blogs" className={`hidden md:block ${linkClass}`}>
            Blogs
          </Link>
          <Link
            href="/blogs?sort=recent"
            className={`hidden md:block ${linkClass}`}
          >
            Recent posts
          </Link>

          {/* Post -> its own page */}
          <Link
            href="/blogs/new"
            className="rounded-[6px] bg-[#1d1d1f] px-4 py-2 text-[15px] font-medium text-white transition-all hover:bg-black active:scale-95"
          >
            Post
          </Link>

          {/* Profile */}
          {profile ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full text-[#2f80ed] transition-opacity hover:opacity-80"
              >
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CircleUser
                    className="h-[34px] w-[34px]"
                    strokeWidth={1.5}
                  />
                )}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-[230px] overflow-hidden rounded-[12px] border border-[#d2d2d7] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                >
                  <div className="border-b border-[#e8e8ed] px-4 py-3">
                    <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">
                      {profile.username}
                    </p>
                  </div>

                  {/* Links shown here on small screens */}
                  <div className="border-b border-[#e8e8ed] py-1 md:hidden">
                    <Link
                      role="menuitem"
                      href="/blogs"
                      onClick={() => setMenuOpen(false)}
                      className={itemClass}
                    >
                      Blogs
                    </Link>
                    <Link
                      role="menuitem"
                      href="/blogs?sort=recent"
                      onClick={() => setMenuOpen(false)}
                      className={itemClass}
                    >
                      Recent posts
                    </Link>
                  </div>

                  <div className="py-1">
                    <Link
                      role="menuitem"
                      href={`/profile/${profile.username}`}
                      onClick={() => setMenuOpen(false)}
                      className={itemClass}
                    >
                      View Profile
                    </Link>
                    <Link
                      role="menuitem"
                      href="/settings/profile"
                      onClick={() => setMenuOpen(false)}
                      className={itemClass}
                    >
                      Edit Profile
                    </Link>
                  </div>

                  <div className="border-t border-[#e8e8ed] py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className={`${itemClass} text-[#d70015]`}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              aria-label="Sign in"
              className="flex h-[34px] w-[34px] items-center justify-center text-[#2f80ed] transition-opacity hover:opacity-80"
            >
              <CircleUser className="h-[34px] w-[34px]" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>

      {/* Search row (below sm, only when toggled) */}
      {searchOpen && (
        <div className="border-t border-[#e8e8ed] px-5 py-3 sm:hidden">
          <div className="relative flex h-[44px] items-center">
            <Search className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-[#6e6e73]" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search for a topic, subtopic, or tag"
              aria-label="Search blogs"
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}