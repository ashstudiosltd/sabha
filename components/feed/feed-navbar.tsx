"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  CircleUser,
  FolderGit2,
  MessageSquare,
  Search,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string | null;
  actor_id?: string | null;
  actor: {
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

interface FeedNavbarProps {
  /** Pre-fills the search box from `?q=` (read on the server page). */
  initialQuery?: string;
  placeholder?: string;
  /** Optional: if omitted, the navbar finds the user and loads notifications itself. */
  userId?: string;
  initialNotifications?: Notification[];
  initialUnreadCount?: number;
  /** Legacy prop from the old page.tsx — ignored (the bell is built in now). */
  notifications?: ReactNode;
}

interface CurrentProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export default function FeedNavbar({
  initialQuery = "",
  placeholder = "Search projects, conversations or people",
  userId,
  initialNotifications,
  initialUnreadCount,
}: FeedNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(userId ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(!!initialQuery);
  const [value, setValue] = useState(initialQuery);

  /* Notifications */
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    initialNotifications ?? []
  );
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);

  /* The user we show the bell for: the prop if given, else the signed-in user */
  const currentUserId = userId ?? authUserId;

  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Search: push the (debounced) text into ?q= — the feed page filters on it */
  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get("q") ?? "";
    if (value.trim() === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");

      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, pathname, router]);

  /* Load current profile (and the signed-in user id) */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) {
        setProfile(null);
        setAuthUserId(null);
        return;
      }

      setAuthUserId(user.id);

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

  /* Load notifications ourselves when the page didn't pass them in */
  useEffect(() => {
    if (!currentUserId) return;
    if (initialNotifications !== undefined) return;

    let cancelled = false;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, title, message, read_at, created_at, entity_id, entity_type, actor_id"
        )
        .eq("recipient_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (cancelled) return;
      if (error) {
        console.error("Failed to load notifications:", error);
        return;
      }

      const rows = data ?? [];
      const actorIds = Array.from(
        new Set(rows.map((r) => r.actor_id).filter(Boolean))
      ) as string[];

      const actors = new Map<string, Notification["actor"]>();

      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, name, avatar_url")
          .in("id", actorIds);

        (profiles ?? []).forEach((p) =>
          actors.set(p.id, {
            username: p.username,
            name: p.name,
            avatar_url: p.avatar_url,
          })
        );
      }

      if (cancelled) return;

      setNotifications(
        rows.map((r) => ({
          ...r,
          actor: r.actor_id ? actors.get(r.actor_id) ?? null : null,
        }))
      );

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", currentUserId)
        .is("read_at", null);

      if (!cancelled) setUnreadCount(count ?? 0);
    };

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [supabase, currentUserId, initialNotifications]);

  /* Realtime notifications */
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const notification = payload.new as Notification;

          /* The realtime payload only has notification columns, so fetch the actor */
          let actor: Notification["actor"] = null;

          if (notification.actor_id) {
            const { data } = await supabase
              .from("profiles")
              .select("username, name, avatar_url")
              .eq("id", notification.actor_id)
              .maybeSingle();

            actor = data ?? null;
          }

          setNotifications((current) =>
            [{ ...notification, actor }, ...current].slice(0, 30)
          );
          setUnreadCount((count) => count + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId]);

  /* Close account popup on outside click / Escape */
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

  /* Close notifications on outside click / Escape */
  useEffect(() => {
    if (!bellOpen) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bellOpen]);

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
    setAuthUserId(null);
    setNotifications([]);
    setUnreadCount(0);
    router.refresh();
  };

  /* ───── Notification actions ───── */

  const markAsRead = async (notificationId: string) => {
    if (!currentUserId) return;

    const target = notifications.find((n) => n.id === notificationId);
    if (!target || target.read_at) return;

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", notificationId)
      .eq("recipient_id", currentUserId);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((n) => (n.id === notificationId ? { ...n, read_at: readAt } : n))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllAsRead = async () => {
    if (!currentUserId || unreadCount === 0) return;

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("recipient_id", currentUserId)
      .is("read_at", null);

    if (error) {
      console.error("Failed to mark notifications as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((n) => ({ ...n, read_at: n.read_at ?? readAt }))
    );
    setUnreadCount(0);
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    setBellOpen(false);

    /* Feed post */
    if (notification.entity_type === "feed_item" && notification.entity_id) {
      router.push(`/feed#${notification.entity_id}`);
      return;
    }

    /* Clan — the clan route uses the slug, so resolve it from the id */
    if (notification.entity_type === "clan" && notification.entity_id) {
      const { data, error } = await supabase
        .from("clans")
        .select("slug")
        .eq("id", notification.entity_id)
        .maybeSingle();

      if (error) {
        console.error("Failed to resolve clan:", error);
        return;
      }

      if (data?.slug) router.push(`/clan/${data.slug}`);
      return;
    }

    /* Profile */
    if (notification.entity_type === "profile" && notification.entity_id) {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", notification.entity_id)
        .maybeSingle();

      if (error) {
        console.error("Failed to resolve profile:", error);
        return;
      }

      if (data?.username) router.push(`/profile/${data.username}`);
    }
  };

  /* "Recent" links: filter the feed by ?type=, keeping the current search */
  const typeHref = (t: "project" | "conversation") => {
    const p = new URLSearchParams();
    if (value.trim()) p.set("q", value.trim());
    p.set("type", t);
    return `${pathname}?${p.toString()}`;
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

  return (
    <>
      {/* ───── Top brand bar (scrolls away) ───── */}
      <div className={`h-[44px] bg-[#f2f2f2] ${font}`}>
        <div className={`${container} flex h-full items-center`}>
          <Link
            href="/feed"
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
            href="/feed"
            className="shrink-0 text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#1d1d1f]"
          >
            Feed.
          </Link>

          {/* Search (sm and up) */}
          <div className="relative ml-2 hidden h-[36px] w-full max-w-[460px] items-center sm:ml-8 sm:flex lg:ml-14">
            <Search className="pointer-events-none absolute left-3 h-[16px] w-[16px] text-[#6e6e73]" />
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              aria-label="Search feed"
              className={inputClass}
            />
          </div>

          {/* Links */}
          <div className="ml-auto flex items-center gap-4 sm:gap-6">
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
            <Link href="/clan" className={`hidden md:block ${linkClass}`}>
              Clans
            </Link>

            {/* Recent — hover dropdown: Conversations / Projects */}
            <div className="group relative hidden md:block">
              <button
                type="button"
                aria-haspopup="menu"
                className={`flex items-center gap-1 ${linkClass}`}
              >
                Recent
                <ChevronDown className="h-[14px] w-[14px] transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
              </button>

              {/* pt-2 keeps the hover area continuous between button and panel */}
              <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div
                  role="menu"
                  className="w-[220px] overflow-hidden rounded-[12px] border border-[#d2d2d7] bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                >
                  <Link
                    role="menuitem"
                    href={typeHref("conversation")}
                    className={`${itemClass} flex items-center gap-2.5`}
                  >
                    <MessageSquare className="h-[16px] w-[16px] text-[#6e6e73]" />
                    Conversations
                  </Link>
                  <Link
                    role="menuitem"
                    href={typeHref("project")}
                    className={`${itemClass} flex items-center gap-2.5`}
                  >
                    <FolderGit2 className="h-[16px] w-[16px] text-[#6e6e73]" />
                    Projects
                  </Link>
                </div>
              </div>
            </div>

            {/* Notifications — hover on desktop, tap on touch screens */}
            {currentUserId && (
              <div ref={bellRef} className="group md:relative">
                <button
                  type="button"
                  onClick={() => setBellOpen((v) => !v)}
                  aria-label="Notifications"
                  aria-haspopup="menu"
                  aria-expanded={bellOpen}
                  className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full text-[#1d1d1f] transition-colors hover:text-[#0066cc]"
                >
                  <Bell className="h-[20px] w-[20px]" strokeWidth={1.75} />

                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#1d1d1f] px-1 text-[10px] font-semibold leading-none text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/*
                  Mobile: spans the full width of the navbar (the sticky bar is
                  the positioned parent). md+: anchored under the bell.
                  pt-2 keeps the hover area continuous between bell and panel.
                */}
                <div
                  className={`absolute inset-x-0 top-full z-50 px-3 pt-2 transition-all duration-150 md:inset-x-auto md:right-0 md:w-[380px] md:px-0 ${
                    bellOpen
                      ? "visible translate-y-0 opacity-100"
                      : "invisible translate-y-1 opacity-0 md:group-hover:visible md:group-hover:translate-y-0 md:group-hover:opacity-100"
                  }`}
                >
                  <div
                    role="menu"
                    className="w-full overflow-hidden rounded-[12px] border border-[#d2d2d7] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#e8e8ed] px-4 py-3">
                      <div>
                        <p className="text-[15px] font-semibold text-[#1d1d1f]">
                          Notifications
                        </p>
                        {unreadCount > 0 && (
                          <p className="mt-0.5 text-[12px] text-[#6e6e73]">
                            {unreadCount} unread
                          </p>
                        )}
                      </div>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="flex items-center gap-1.5 text-[13px] text-[#1d1d1f] transition-colors hover:text-[#0066cc]"
                        >
                          <CheckCheck className="h-[14px] w-[14px]" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-[60vh] overflow-y-auto md:max-h-[420px]">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                          <Bell
                            className="mx-auto h-[24px] w-[24px] text-[#86868b]"
                            strokeWidth={1.5}
                          />
                          <p className="mt-3 text-[14px] text-[#1d1d1f]">
                            You&apos;re all caught up.
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            role="menuitem"
                            onClick={() => openNotification(notification)}
                            className={`flex w-full gap-3 border-b border-[#e8e8ed] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f5f5f7] ${
                              notification.read_at ? "" : "bg-[#fafafc]"
                            }`}
                          >
                            {/* Avatar */}
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f5f7]">
                              {notification.actor?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={notification.actor.avatar_url}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[13px] font-medium text-[#1d1d1f]">
                                  {(
                                    notification.actor?.name ??
                                    notification.actor?.username ??
                                    "S"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] leading-5 text-[#1d1d1f]">
                                {notification.title}
                              </p>

                              {notification.message && (
                                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#6e6e73]">
                                  {notification.message}
                                </p>
                              )}

                              <p className="mt-1 text-[11px] text-[#86868b]">
                                {formatNotificationTime(notification.created_at)}
                              </p>
                            </div>

                            {/* Unread indicator */}
                            {!notification.read_at && (
                              <span className="mt-2 h-[7px] w-[7px] shrink-0 rounded-full bg-[#0071e3]" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Post -> opens the create page */}
            <Link
              href="/feed/new"
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

                  {/* Clans / Conversations / Projects on small screens */}
                  <div className="border-b border-[#e8e8ed] py-1 md:hidden">
                    <Link
                      role="menuitem"
                      href="/clan"
                      onClick={() => setMenuOpen(false)}
                      className={itemClass}
                    >
                      Clans
                    </Link>
                    <Link
                      role="menuitem"
                      href={typeHref("conversation")}
                      className={itemClass}
                    >
                      Recent conversations
                    </Link>
                    <Link
                      role="menuitem"
                      href={typeHref("project")}
                      className={itemClass}
                    >
                      Current projects
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
              <Search className="pointer-events-none absolute left-3 h-[16px] w-[16px] text-black" />
              <input
                ref={searchRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                aria-label="Search feed"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function formatNotificationTime(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}