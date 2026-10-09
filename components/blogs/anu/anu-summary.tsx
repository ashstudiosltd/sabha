"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./anu-panel.module.css";
import type { BlogPost } from "@/data/blog";

const STORAGE = "sabha-anu-summaries-v1";
type Summary = { text: string; title: string };
const memory = new Map<string, Summary>();
const pending = new Map<string, Promise<Summary>>();
function cached(id: string) {
  if (memory.has(id)) return memory.get(id)!;
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE) || "{}")[id];
    if (typeof value === "string" && value) { const legacy = { text: value, title: "" }; memory.set(id, legacy); return legacy; }
    if (value && typeof value.text === "string" && typeof value.title === "string") { memory.set(id, value); return value as Summary; }
  } catch { /* In-memory cache still works if session storage is unavailable. */ }
  return null;
}
function generate(id: string) {
  const existing = cached(id);
  if (existing) return Promise.resolve(existing);
  if (pending.has(id)) return pending.get(id)!;
  const task = (async () => {
    const response = await fetch("/api/anu/blogs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId: id, intent: "summary", message: "Summarize the selected article.", history: [] }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await response.json();
    if (!response.ok || typeof data.reply !== "string" || !data.reply.trim()) throw new Error(data.error || "The summary couldn't load. Please try again.");
    const result = { text: data.reply, title: typeof data.summaryTitle === "string" ? data.summaryTitle : "" };
    memory.set(id, result);
    try {
      const all = JSON.parse(sessionStorage.getItem(STORAGE) || "{}");
      // Summaries last for this tab session; existing summaries are never regenerated.
      sessionStorage.setItem(STORAGE, JSON.stringify({ ...all, [id]: result }));
    } catch { /* The session's in-memory copy remains available. */ }
    return result;
  })().finally(() => pending.delete(id));
  pending.set(id, task);
  return task;
}

export function useBlogSummary(post: BlogPost | null) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState(false);
  const current = useRef(post?.id);
  current.current = post?.id;
  useEffect(() => {
    setSummary(post ? cached(post.id) : null); setActive(false); setBusy(false); setError(""); setFresh(false);
  }, [post?.id]);
  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => setFresh(false), 2200);
    return () => clearTimeout(timer);
  }, [fresh]);
  async function toggle() {
    if (!post || busy) return;
    if (active) { setActive(false); setFresh(false); return; }
    const existing = summary || cached(post.id);
    if (existing) { setSummary(existing); setFresh(false); setActive(true); return; }
    const id = post.id;
    setBusy(true); setError("");
    try {
      const text = await generate(id);
      if (current.current !== id) return;
      setSummary(text); setFresh(true); setActive(true);
    } catch (failure) {
      if (current.current === id) setError(failure instanceof Error && failure.name === "TimeoutError" ? "The summary is taking longer than expected. Please try again." : failure instanceof Error ? failure.message : "The summary couldn't load. Please try again.");
    } finally { if (current.current === id) setBusy(false); }
  }
  return { summary: summary?.text || "", title: summary?.title || (post ? `In brief: ${post.title}` : ""), active, busy, error, fresh, toggle };
}

export function AnuReveal({ text, animate, delay = 0 }: { text: string; animate: boolean; delay?: number }) {
  let word = 0;
  return <>{text.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{animate ? paragraph.split(/(\s+)/).map((token, i) => /\s/.test(token) ? token : <span key={i} className={styles.revealWord} style={{ animationDelay: `${delay + Math.min(word++ * 24, 1200)}ms` }}>{token}</span>) : paragraph}</p>)}</>;
}

export function AnuTitle({ text, animate }: { text: string; animate: boolean }) {
  if (!animate) return <>{text}</>;
  let word = 0;
  return <>{text.split(/(\s+)/).map((token, index) => /\s/.test(token) ? token : <span key={index} className={styles.revealWord} style={{ animationDelay: `${word++ * 24}ms` }}>{token}</span>)}</>;
}
