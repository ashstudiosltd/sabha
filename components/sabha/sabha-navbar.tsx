"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUser, Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import BackNavigation from "@/components/sabha/back-navigation";
import NotificationCenter from "@/components/sabha/notification-center";

interface SabhaNavbarProps {
  backFallback?: {href:string;label:string};
  signInHref?:string;
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
  /** The active Sabha area. Defaults to the current route. */
  section?: "blogs" | "feed" | "projects";
  feedView?: "conversation" | "project" | "clans";
  showClanCreateAction?: boolean;
  /** Contextual action for areas that provide one. */
  action?: { label: string; href: string };
}

const sectionTitles = {
  blogs: "Blogs",
  feed: "Feed",
  projects: "Projects",
} as const;

const sectionLinks = [
  { id: "blogs", label: "Blogs", href: "/blogs" },
  { id: "feed", label: "Feed", href: "/feed" },
  { id: "projects", label: "Projects", href: "/projects" },
] as const;

interface CurrentProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export default function SabhaNavbar({
  query,
  onQueryChange,
  initialQuery = "",
  placeholder,
  searchPath,
  section: requestedSection,
  feedView = "conversation",
  showClanCreateAction = true,
  action,
  backFallback,
  signInHref="/app/auth",
}: SabhaNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const section = requestedSection ?? (
    pathname.startsWith("/sabha/projects") || pathname.startsWith("/projects")
      ? "projects"
      : pathname.startsWith("/feed") || pathname.startsWith("/sabha/feed")
        ? "feed"
        : "blogs"
  );
  const sectionTitle = sectionTitles[section];
  const sectionHref = section === "blogs" ? "/blogs" : section === "feed" ? "/feed" : "/projects";
  const searchPlaceholder = placeholder ?? {
    blogs: "Search for a topic, subtopic, or tag",
    feed: "Search the community feed",
    projects: "Search community projects",
  }[section];
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

  // Keep URL-driven search aligned when filters clear or browser navigation restores a query.
  useEffect(() => {
    if(isControlled)return;
    const frame=requestAnimationFrame(()=>setLocalQuery(initialQuery));
    return()=>cancelAnimationFrame(frame);
  },[initialQuery,isControlled]);
  const value = isControlled ? (query as string) : localQuery;
  const setValue = (next: string) => {
    if (isControlled) onQueryChange!(next);
    else setLocalQuery(next);
  };

  /* URL mode: push the (debounced) text into ?q= */
  /* URL mode: restore the input from ?q= after a reload / direct visit */
  useEffect(() => {
    if (isControlled) return;
    const frame = requestAnimationFrame(() => {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setLocalQuery(q);
    });
    return () => cancelAnimationFrame(frame);
  }, [isControlled]);

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

  const itemClass = "sabha-nav-menu-item";
  const inputClass = "sabha-field";
  const primaryAction = action ?? (section === "blogs"
    ? { label: "Post", href: "/blogs/new" }
    : section === "feed"
      ? feedView === "clans"
        ? showClanCreateAction ? { label: "Create Clan", href: "/feed/clans/new" } : undefined
        : { label: "Post", href: feedView === "project" ? "/feed/new?type=project" : "/feed/new?type=conversation" }
      : undefined);
  /*
    Returned as a fragment on purpose: the gray brand bar scrolls away with
    the page, while the white bar is `sticky` relative to the page container
    (not to a wrapper that is only as tall as the navbar).
  */
  return (
    <>
      {/* ───── Top brand bar (scrolls away) ───── */}
      <div className="sabha-brand-strip">
        <div className="sabha-brand-strip-inner">
          <Link
            href="/"
            aria-label="Sabha"
            className="sabha-nav-brand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logot.png"
              alt=""
              className=""
            />
            <span className="sabha-nav-brand-name">
              Sabha. 
            </span>
          </Link>
          <BackNavigation fallback={backFallback} />
        </div>
      </div>

      {/* ───── Main bar (stays fixed at the top on scroll) ───── */}
      <div
        className="sabha-nav"
      >
        <div className="sabha-nav-inner">
          {/* Title */}
          <Link
            href={sectionHref}
            className="sabha-nav-section"
          >
            {sectionTitle}.
          </Link>

          {/* Search (sm and up) */}
          <div className="sabha-nav-search">
            <Search className="pointer-events-none absolute left-3 h-[16px] w-[16px] text-[#6e6e73]" />
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={`Search ${section}`}
              className={inputClass}
            />
          </div>

          {/* Links */}
          <div className="sabha-nav-links">
            {/* Search toggle (below sm) */}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              className="sabha-nav-mobile-search"
            >
              {searchOpen ? (
                <X className="h-[20px] w-[20px]" />
              ) : (
                <Search className="h-[20px] w-[20px]" />
              )}
            </button>

            {/* Desktop links */}
            {sectionLinks.filter((item) => item.id !== section).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="sabha-nav-link"
                aria-current={section === item.id ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            {section === "blogs" && (
              <Link href="/blogs?sort=recent" className="sabha-nav-link">
                Recent posts
              </Link>
            )}

            {/* Post -> its own page */}
            {primaryAction && (
              <Link href={primaryAction.href} className="sabha-button sabha-button-primary sabha-nav-primary">
                {primaryAction.label}
              </Link>
            )}

            {profile && <NotificationCenter userId={profile.id} area={section} />}

            {/* Profile / Account menu (works both logged in and logged out) */}
            <div ref={menuRef} className="sabha-nav-account">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={profile ? "Account menu" : "Sign in menu"}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full text-[#2f80ed] transition-opacity hover:opacity-80"
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
                  className="sabha-nav-menu"
                >
                  {profile && (
                  <div className="border-b border-[var(--sabha-border)] px-4 py-3">
                      <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">
                        {profile.username}
                      </p>
                    </div>
                  )}

                  <div className="border-b border-[var(--sabha-border)] py-1 md:hidden">
                    {sectionLinks.filter((item) => item.id !== section).map((item) => (
                      <Link key={item.id} role="menuitem" href={item.href} onClick={() => setMenuOpen(false)} className={itemClass}>
                        {item.label}
                      </Link>
                    ))}
                    {section === "blogs" && (
                      <Link role="menuitem" href="/blogs?sort=recent" onClick={() => setMenuOpen(false)} className={itemClass}>
                        Recent posts
                      </Link>
                    )}
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
                      <div className="border-t border-[var(--sabha-border)] py-1">
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
                        href={signInHref}
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
          <div className="sabha-nav-mobile-search-row">
            <div className="sabha-nav-search">
              <Search className="pointer-events-none absolute left-3 h-[16px] w-[16px] text-[#6e6e73]" />
              <input
                ref={searchRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Search ${section}`}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
