"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUser, Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

interface BlogNavbarProps {
  /**
   * Controlled mode (e.g. the /blogs client page): pass BOTH `query` and
   * `onQueryChange`.
   *
   * URL mode (e.g. server pages like the profile page): pass neither.
   * The navbar keeps the text in the `?q=` search param, and the server
   * page reads `searchParams.q` to filter. Pass `initialQuery` so the
   * input is pre-filled on first render.
   */
  query?: string;
  onQueryChange?: (value: string) => void;
  initialQuery?: string;
  placeholder?: string;
  /**
   * URL mode only: the route that owns the search (e.g. "/blogs").
   * If the user types while on a different route, they are sent there.
   * Omit to filter the current page.
   */
  searchPath?: string;
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
  initialQuery = "",
  placeholder = "Search for a topic, subtopic, or tag",
  searchPath,
}: BlogNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(!!initialQuery);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Controlled vs URL mode */
  const isControlled =
    typeof query === "string" && typeof onQueryChange === "function";
  const [localQuery, setLocalQuery] = useState(initialQuery);

  const value = isControlled ? (query as string) : localQuery;
  const setValue = (next: string) => {
    if (isControlled) onQueryChange!(next);
    else setLocalQuery(next);
  };

  /* URL mode: push the (debounced) text into ?q= */
  /* URL mode: restore the input from ?q= after a reload / direct visit */
  useEffect(() => {
    if (isControlled) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setLocalQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isControlled) return;

    const target = searchPath ?? pathname;
    const onTarget = target === pathname;

    const current =
      new URLSearchParams(window.location.search).get("q") ?? "";
    if (value.trim() === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(onTarget ? window.location.search : "");
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");

      const qs = next.toString();
      const href = qs ? `${target}?${qs}` : target;

      if (onTarget) router.replace(href, { scroll: false });
      else router.push(href);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, isControlled, pathname, searchPath, router]);

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
    router.refresh();
  };

  const font =
    "font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]";
  const container = "mx-auto w-full max-w-[980px] px-5";
  const linkClass =
    "text-[14px] text-[#1d1d1f] transition-colors hover:text-[#0066cc]";
  const itemClass =
    "block w-full px-4 py-2.5 text-left text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7]";
  const inputClass =
    "h-full w-full rounded-[10px] border border-[#d2d2d7] bg-white pl-10 pr-4 text-[16px] text-[#1d1d1f] outline-none transition-colors placeholder:text-[#86868b] focus:border-[#0071e3] sm:text-[15px]";

  /*
    Returned as a fragment on purpose: the gray brand bar scrolls away with
    the page, while the white bar is `sticky` relative to the page container
    (not to a wrapper that is only as tall as the navbar).
  */
  return (
    <>
      {/* ───── Top brand bar (scrolls away) ───── */}
      <div className={`h-[44px] bg-[#f2f2f2] ${font}`}>
        <div className={`${container} flex h-full items-center`}>
          <Link
            href="/blogs"
            aria-label="Sabha"
            className="flex items-center gap-1.5 text-[#1d1d1f]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logot.png"
              alt=""
              className="h-[22px] w-auto object-contain"
            />
            <span className="text-[21px] font-medium leading-none tracking-[-0.02em]">
              Sabha. 
            </span>
          </Link>
        </div>
      </div>

      {/* ───── Main bar (stays fixed at the top on scroll) ───── */}
      <div
        className={`sticky top-0 z-40 border-b border-[#d2d2d7] bg-white ${font}`}
      >
        <div className={`${container} flex h-[58px] items-center gap-4 sm:gap-6`}>
          {/* Title */}
          <Link
            href="/blogs"
            className="shrink-0 text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#1d1d1f]"
          >
            Blogs. 
          </Link>

          {/* Search (sm and up) */}
          <div className="relative ml-2 hidden h-[36px] w-full max-w-[460px] items-center sm:ml-8 sm:flex lg:ml-14">
            <Search className="pointer-events-none absolute left-3 h-[16px] w-[16px] text-[#6e6e73]" />
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              aria-label="Search blogs"
              className={inputClass}
            />
          </div>

          {/* Links */}
          <div className="ml-auto flex items-center gap-5 sm:gap-6">
            {/* Search toggle (below sm) */}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              className="text-[#1d1d1f] sm:hidden"
            >
              {searchOpen ? (
                <X className="h-[20px] w-[20px]" />
              ) : (
                <Search className="h-[20px] w-[20px]" />
              )}
            </button>

            {/* Desktop links */}
            <Link href="/blogs" className={`hidden md:block ${linkClass}`}>
              Blogs. 
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
              className="flex h-[28px] items-center rounded-[6px] bg-[#1d1d1f] px-3.5 text-[14px] font-medium text-white transition-all hover:bg-black active:scale-95"
            >
              Post
            </Link>

            {/* Profile / Account menu (works both logged in and logged out) */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={profile ? "Account menu" : "Sign in menu"}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full text-[#2f80ed] transition-opacity hover:opacity-80"
              >
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CircleUser
                    className="h-[30px] w-[30px]"
                    strokeWidth={1.5}
                  />
                )}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-[230px] overflow-hidden rounded-[12px] border border-[#d2d2d7] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                >
                  {profile && (
                    <div className="border-b border-[#e8e8ed] px-4 py-3">
                      <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">
                        {profile.username}
                      </p>
                    </div>
                  )}

                  {/* Blogs / Recent posts shown here on small screens, both states */}
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

                  {profile ? (
                    <>
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
                    </>
                  ) : (
                    <div className="py-1">
                      <Link
                        role="menuitem"
                        href="/app/auth"
                        onClick={() => setMenuOpen(false)}
                        className={itemClass}
                      >
                        Sign in
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search row (below sm, only when toggled) */}
        {searchOpen && (
          <div className="border-t border-[#e8e8ed] px-5 py-3 sm:hidden">
            <div className="relative flex h-[40px] items-center">
              <Search className="pointer-events-none absolute left-3 h-[16px] w-[16px] text-[#6e6e73]" />
              <input
                ref={searchRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                aria-label="Search blogs"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}