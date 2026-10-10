"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, MessageCircle, Heart, UserRound, Users, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import styles from "./notification-center.module.css";

type NotificationType = "clan_invite" | "clan_join_request" | "clan_join_accepted" | "post_like" | "post_comment" | "new_blog_post" | "new_feed_post" | "feed_reply" | "feed_comment" | "follow";

interface NotificationItem {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  entity_id: string | null;
  entity_type: string;
  target_path: string;
  read_at: string | null;
  created_at: string;
  actor: { name: string | null; username: string | null; avatar_url: string | null } | null;
}

function formatRelativeTime(dateValue: string) {
  const elapsed = Math.max(0, Date.now() - new Date(dateValue).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(dateValue));
}

function iconFor(type: NotificationType) {
  if (type === "post_like") return <Heart size={16} />;
  if (type === "follow") return <UserRound size={16} />;
  if (type.startsWith("clan_")) return <Users size={16} />;
  return <MessageCircle size={16} />;
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(async () => {
    const { count, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (countError) {
      setError(countError.code === "42P01" ? "Run the Sabha notifications migration to enable this panel." : "Notifications couldn’t be loaded.");
      return;
    }
    setError(null);
    setUnreadCount(count ?? 0);
  }, [supabase, userId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id, recipient_id, actor_id, type, title, message, entity_id, entity_type, target_path, read_at, created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (loadError) {
      setError(loadError.code === "42P01" ? "Run the Sabha notifications migration to enable this panel." : "Notifications couldn’t be loaded.");
      setItems([]);
      setLoading(false);
      return;
    }

    const actorIds = [...new Set((data ?? []).map((item) => item.actor_id).filter((id): id is string => !!id))];
    const actorsResult = actorIds.length
      ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", actorIds)
      : { data: [], error: null };
    const actors = new Map((actorsResult.data ?? []).map((actor) => [actor.id, actor]));
    setItems((data ?? []).map((item) => ({
      ...item,
      type: item.type as NotificationType,
      actor: item.actor_id ? actors.get(item.actor_id) ?? null : null,
    })));
    setLoading(false);
    setError(actorsResult.error ? "Some member details couldn’t be loaded." : null);
    void loadUnreadCount();
  }, [loadUnreadCount, supabase, userId]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => void loadUnreadCount(), 0);
    const channel = supabase
      .channel(`sabha-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, () => {
        void loadUnreadCount();
        if (open) void loadItems();
      })
      .subscribe();
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadUnreadCount();
        if (open) void loadItems();
      }
    };
    const poll = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [loadItems, loadUnreadCount, open, supabase, userId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) void loadItems();
  };

  const markRead = async (item: NotificationItem) => {
    if (!item.read_at) {
      const now = new Date().toISOString();
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: now } : entry));
      setUnreadCount((count) => Math.max(0, count - 1));
      const { error: updateError } = await supabase.from("notifications").update({ read_at: now }).eq("id", item.id).eq("recipient_id", userId);
      if (updateError) {
        setError("Couldn’t update this notification. Please try again.");
        void loadItems();
        return;
      }
    }
    setOpen(false);
    if (item.target_path.startsWith("/")) router.push(item.target_path);
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => item.read_at ? item : { ...item, read_at: now }));
    setUnreadCount(0);
    const { error: updateError } = await supabase.from("notifications").update({ read_at: now }).eq("recipient_id", userId).is("read_at", null);
    if (updateError) {
      setError("Couldn’t mark notifications as read. Please try again.");
      void loadItems();
    }
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button type="button" className={styles.trigger} onClick={toggleOpen} aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={open} aria-haspopup="dialog">
        <Bell aria-hidden="true" />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <section className={styles.panel} role="dialog" aria-label="Sabha notifications">
          <header className={styles.header}>
            <div className={styles.heading}><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : "You’re all caught up"}</span></div>
            <button type="button" className={styles.markRead} onClick={() => void markAllRead()} disabled={!unreadCount}>Mark all read</button>
            <button type="button" className={styles.markRead} onClick={() => setOpen(false)} aria-label="Close notifications"><X size={16} /></button>
          </header>
          {loading ? <div className={styles.loading}>Loading updates…</div> : items.length ? (
            <div className={styles.list}>
              {items.map((item) => {
                const actorName = item.actor?.name || (item.actor?.username ? `@${item.actor.username}` : "Sabha");
                return (
                  <button type="button" key={item.id} className={styles.item} onClick={() => void markRead(item)}>
                    <span className={styles.avatar}>
                      {item.actor?.avatar_url ? <Image src={item.actor.avatar_url} alt="" width={34} height={34} unoptimized referrerPolicy="no-referrer" /> : item.actor ? actorName.slice(0, 1).toUpperCase() : iconFor(item.type)}
                    </span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemMessage}>{item.message || (item.actor ? `${actorName} · ${item.type.replaceAll("_", " ")}` : "A new update from Sabha")}</span>
                      <span className={styles.itemTime}>{formatRelativeTime(item.created_at)}</span>
                    </span>
                    <span className={item.read_at ? styles.readDot : styles.unreadDot} aria-label={item.read_at ? "Read" : "Unread"} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              {error ? <X /> : <CheckCheck />}
              <strong>{error ? "Notifications unavailable" : "Nothing new yet"}</strong>
              <span>{error || "Replies, comments, follows, and Clan activity will appear here."}</span>
            </div>
          )}
          {error && items.length > 0 && <p className={`${styles.error} px-4 pb-3`} role="status">{error}</p>}
        </section>
      )}
    </div>
  );
}
