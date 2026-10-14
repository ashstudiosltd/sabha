"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, MessageCircle, Heart, UserRound, Users, X, Mail, ShieldCheck, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NotificationItem, NotificationType } from "@/lib/notification-types";
import { createClient } from "@/lib/supabase/client";
import styles from "./notification-center.module.css";

type Filter = "all" | "unread" | "clans";
const PAGE_SIZE = 20;
const FIELDS = "id, recipient_id, actor_id, type, title, message, entity_id, entity_type, target_path, read_at, created_at";
function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}
function iconFor(type: NotificationType) {
  if (type === "post_like" || type === "feed_like") return <Heart size={18} />;
  if (type === "follow") return <UserRound size={18} />;
  if (type.includes("deleted") || type.includes("removed")) return <Trash2 size={18} />;
  if (type.includes("invite")) return <Mail size={18} />;
  if (type.includes("accepted") || type.includes("role") || type.includes("ownership")) return <ShieldCheck size={18} />;
  if (type.startsWith("clan_")) return <Users size={18} />;
  return <MessageCircle size={18} />;
}
function safePath(path: string) { return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\"); }

export default function NotificationCenter({ userId, fullPage = false }: { userId: string; fullPage?: boolean }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(fullPage);
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [updatesAvailable, setUpdatesAvailable] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestSequence = useRef(0);
  const openRef = useRef(open);
  const itemsRef = useRef(items);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const loadUnreadCount = useCallback(async () => {
    const { count, error: countError } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null);
    if (!countError) setUnreadCount(count ?? 0);
  }, [supabase, userId]);

  const loadItems = useCallback(async (append = false) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    const cursor = append ? itemsRef.current.at(-1) : undefined;
    const fetchPage = (extended: boolean) => {
      let query = supabase.from("notifications").select(extended ? `${FIELDS}, clan_id, context_label, preview` : FIELDS).eq("recipient_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE);
      if (filter === "unread") query = query.is("read_at", null);
      if (filter === "clans") query = extended ? query.or("clan_id.not.is.null,type.like.clan_%,type.eq.new_clan_post") : query.or("type.like.clan_%");
      if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
      return query;
    };
    let result = await fetchPage(true);
    if (result.error?.code === "42703") result = await fetchPage(false);
    if (sequence !== requestSequence.current) return;
    if (result.error) {
      setError("Notifications couldn’t load. Please try again.");
      setLoading(false);
      return;
    }
    const rows = (result.data ?? []) as unknown as Omit<NotificationItem, "actor">[];
    const actorIds = [...new Set(rows.map((item) => item.actor_id).filter((id): id is string => !!id))];
    const actorsResult = actorIds.length ? await supabase.from("profiles").select("id, name, username, avatar_url").in("id", actorIds) : { data: [], error: null };
    if (sequence !== requestSequence.current) return;
    const actors = new Map((actorsResult.data ?? []).map((actor) => [actor.id, actor]));
    const next = rows.map((item) => ({ ...item, actor: item.actor_id ? actors.get(item.actor_id) ?? null : null }));
    setItems((current) => append ? [...current, ...next.filter((item) => !current.some((entry) => entry.id === item.id))] : next);
    setHasMore(rows.length === PAGE_SIZE);
    if (!append) setUpdatesAvailable(false);
    setError(actorsResult.error ? "Some member details couldn’t load." : null);
    setLoading(false);
    void loadUnreadCount();
  }, [filter, loadUnreadCount, supabase, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUnreadCount(); if (open) void loadItems(); }, 0);
    return () => { window.clearTimeout(timer); requestSequence.current += 1; };
  }, [loadItems, loadUnreadCount, open]);

  useEffect(() => {
    let refreshTimer: number | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { void loadUnreadCount(); if (openRef.current) { if (itemsRef.current.length > PAGE_SIZE) setUpdatesAvailable(true); else void loadItems(); } }, 150);
    };
    const channel = supabase.channel(`sabha-notifications-${userId}-${fullPage ? "page" : "bell"}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, refresh).subscribe();
    const poll = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.clearTimeout(refreshTimer); window.clearInterval(poll); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); void supabase.removeChannel(channel); };
  }, [fullPage, loadItems, loadUnreadCount, supabase, userId]);

  useEffect(() => {
    if (!open || fullPage) return;
    const onDown = (event: MouseEvent | TouchEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("mousedown", onDown); document.addEventListener("touchstart", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); document.removeEventListener("keydown", onKey); };
  }, [fullPage, open]);

  const markRead = async (item: NotificationItem) => {
    if (!item.read_at) {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from("notifications").update({ read_at: now }).eq("id", item.id).eq("recipient_id", userId);
      if (updateError) { setError("Couldn’t mark this update as read. Try again."); return; }
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: now } : entry));
      void loadUnreadCount();
    }
    if (!fullPage) setOpen(false);
    if (safePath(item.target_path)) {
      const target = new URL(item.target_path, window.location.origin);
      const samePage = target.pathname === window.location.pathname && target.search === window.location.search;
      router.push(item.target_path);
      if (samePage) router.refresh();
    }
  };
  const markAllRead = async () => {
    setMarking(true);
    // Only mark activity that existed when this action started.
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("notifications").update({ read_at: now }).eq("recipient_id", userId).is("read_at", null).lte("created_at", now);
    if (updateError) setError("Couldn’t mark notifications as read. Try again.");
    else { await loadItems(); await loadUnreadCount(); }
    setMarking(false);
  };

  return <div className={fullPage ? styles.pageRoot : styles.root} ref={rootRef}>
    {!fullPage && <button ref={triggerRef} type="button" className={styles.trigger} onClick={() => setOpen((value) => !value)} aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={open} aria-haspopup="dialog"><Bell aria-hidden="true" />{unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>}
    {open && <section className={fullPage ? styles.pagePanel : styles.panel} role={fullPage ? "region" : "dialog"} aria-label="Sabha notifications">
      <header className={styles.header}><div className={styles.heading}><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : "You’re all caught up"}</span></div><button type="button" className={styles.markRead} disabled={!unreadCount || marking} onClick={() => void markAllRead()}>{marking ? "Updating…" : "Mark all read"}</button>{!fullPage && <button type="button" className={styles.markRead} onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="Close notifications"><X size={16} /></button>}</header>
      <div className={styles.filters} aria-label="Filter notifications">{(["all", "unread", "clans"] as Filter[]).map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { if (filter !== value) { setItems([]); itemsRef.current = []; setFilter(value); } }}>{value === "all" ? "All" : value === "unread" ? "Unread" : "Clans"}</button>)}</div>
      {updatesAvailable && <button type="button" className={styles.more} onClick={() => void loadItems()}>Refresh activity</button>}
      <div className={styles.list} aria-busy={loading}>
        {items.map((item) => { const actorName = item.actor?.name || (item.actor?.username ? `@${item.actor.username}` : "Sabha"); return <button type="button" key={item.id} className={`${styles.item} ${!item.read_at ? styles.unreadItem : ""}`} onClick={() => void markRead(item)}>
          <span className={styles.eventIcon} aria-hidden="true">{iconFor(item.type)}</span>
          <span className={styles.itemBody}>
            <span className={styles.rowIdentity}><span className={styles.avatar}>{item.actor?.avatar_url ? <Image src={item.actor.avatar_url} alt="" width={30} height={30} unoptimized referrerPolicy="no-referrer" /> : actorName.slice(0, 1).toUpperCase()}</span><span className={styles.itemTime}><time dateTime={item.created_at}>{relativeTime(item.created_at)}</time></span></span>
            <span className={styles.itemTitle}><strong>{actorName}</strong> {item.title}</span>
            {item.context_label && <span className={styles.context}>{item.context_label}</span>}
            {item.message && <span className={styles.itemMessage}>{item.message}</span>}
            {item.preview && <span className={styles.preview}>{item.preview}</span>}
          </span><span className={item.read_at ? styles.readDot : styles.unreadDot} aria-label={item.read_at ? "Read" : "Unread"} />
        </button>; })}
        {loading && <div className={styles.loading} role="status">Loading updates…</div>}
        {!loading && !items.length && <div className={styles.empty}><CheckCheck /><strong>{filter === "unread" ? "You’re all caught up" : "Nothing here yet"}</strong><span>Clan updates, replies, likes, and invitations will appear here.</span></div>}
        {error && <div className={styles.error} role="alert">{error} <button type="button" className={styles.markRead} onClick={() => void loadItems()}>Retry</button></div>}
        {!loading && hasMore && <button type="button" className={styles.more} onClick={() => void loadItems(true)}>Load older updates</button>}
      </div>
      {!fullPage && <Link href="/notifications" className={styles.more} onClick={() => setOpen(false)}>View all activity</Link>}
    </section>}
  </div>;
}
