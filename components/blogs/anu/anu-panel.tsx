"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import styles from "./anu-panel.module.css";
import "./anu-orb.css";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { AnuReveal } from "./anu-summary";
import { ArrowUp, X } from "lucide-react";

type Source = { title: string; url: string };
type Message = { role: "user" | "assistant"; text: string; sources?: Source[] };
const STORAGE = "sabha-anu-blogs-v1";

function LivingDot() {
  return <span className={`living-dot dot-idle ${styles.orb}`} aria-hidden="true"><span className="dot-halo" /><span className="dot-body"><i /></span></span>;
}

function HoverText({ text }: { text: string }) {
  return <>{text.split(" ").map((word, index) => <span key={index}><span className={styles.hoverWord} style={{ "--word-delay": `${index * 16}ms` } as CSSProperties}>{word}</span>{" "}</span>)}</>;
}

function historyFor(messages: Message[]) {
  const history = messages.slice(-20).map(({ role, text }) => ({ role, text: text.slice(0, 4000) }));
  while (JSON.stringify(history).length > 24_000) history.shift();
  // The model's first context message should be a user turn.
  while (history[0]?.role === "assistant") history.shift();
  return history;
}

function AnuPanel({ onClose, onHeight }: { onClose: () => void; onHeight: (height: number) => void }) {
  const key = "home";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [freshReply, setFreshReply] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sending = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const content = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      const available = Math.max(120, Math.min(570, (window.visualViewport?.height || window.innerHeight) - (window.innerWidth <= 480 ? 120 : 140)));
      const natural = (content.current?.scrollHeight || 0) + (header.current?.offsetHeight || 0) + (composer.current?.offsetHeight || 0) + 26;
      onHeight(Math.min(available, Math.max(180, Math.ceil(natural))));
    };
    const observer = new ResizeObserver(update);
    [content.current, header.current, composer.current].forEach((element) => { if (element) observer.observe(element); });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    update();
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); };
  }, [onHeight]);

  useLayoutEffect(() => {
    const field = textarea.current;
    if (!field) return;
    field.style.height = "20px";
    field.style.height = `${Math.min(100, field.scrollHeight)}px`;
    field.style.overflowY = field.scrollHeight > 100 ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    try {
      const all = JSON.parse(sessionStorage.getItem(STORAGE) || "{}");
      const stored = all[key];
      if (Array.isArray(stored)) setMessages(stored.filter((item): item is Message => item && ["user", "assistant"].includes(item.role) && typeof item.text === "string").slice(-20));
    } catch { /* Session storage may be unavailable. */ }
    setReady(true);
    return () => { controller.current?.abort(); controller.current = null; };
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      const previous = JSON.parse(sessionStorage.getItem(STORAGE) || "{}");
      const entries = Object.entries(previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {}).filter(([id]) => id !== key).slice(-9);
      entries.push([key, messages.slice(-20)]);
      while (JSON.stringify(Object.fromEntries(entries)).length > 150_000 && entries.length > 1) entries.shift();
      sessionStorage.setItem(STORAGE, JSON.stringify(Object.fromEntries(entries)));
    } catch { /* Chat remains usable without storage. */ }
  }, [key, messages, ready]);

  useEffect(() => {
    if (nearBottom.current) scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, busy, error]);

  async function send(text: string) {
    const question = text.trim();
    if (!ready || sending.current || !question || question.length > 2000) return;
    sending.current = true; nearBottom.current = true;
    const previous = messages;
    setMessages([...previous, { role: "user", text: question }]);
    setInput(""); setError(""); setBusy(true);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 60_000);
    try {
      const response = await fetch("/api/anu/blogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, history: historyFor(previous), articleId: null }), signal: abort.signal });
      const data = await response.json();
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || "Anu couldn't reply. Please try again.");
      if (controller.current !== abort) return;
      const knownSources = new Set(previous.flatMap((message) => message.sources || []).map((source) => source.url));
      const sources = Array.isArray(data.sources) ? data.sources.filter((source: Source) => source && typeof source.title === "string" && typeof source.url === "string" && /^https:\/\/sabha\.devvrats\.in\/blogs\/[a-zA-Z0-9-]+$/.test(source.url) && !knownSources.has(source.url)) : [];
      setFreshReply(Math.min(previous.length + 1, 19));
      setMessages([...previous, { role: "user", text: question }, { role: "assistant", text: data.reply, sources }].slice(-20) as Message[]);
    } catch (failure) {
      if (controller.current !== abort) return;
      setMessages(previous); setInput(question);
      setError(abort.signal.aborted ? "Anu is taking longer than expected. Please try again." : failure instanceof Error ? failure.message : "Anu couldn't connect. Please try again.");
    } finally {
      clearTimeout(timeout);
      if (controller.current === abort) { sending.current = false; controller.current = null; setBusy(false); }
    }
  }

  useEffect(() => {
    if (freshReply === null) return;
    const timer = setTimeout(() => setFreshReply(null), 1800);
    return () => clearTimeout(timer);
  }, [freshReply]);
  const prompts = ["What's new in blogs?", "Find a story for me", "What is the community sharing?"];
  return <section aria-label="Ask Anu about Sabha blogs" className={styles.panel}>
    <div ref={header} className={styles.header}>

      <button type="button" aria-label="Close conversation" onClick={onClose} className={styles.iconButton}><X size={17} /></button>
    </div>
    <div ref={scroll} onScroll={() => { const el = scroll.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className={styles.log} role="log" aria-label="Conversation with Anu" aria-live="polite" aria-busy={busy}>
      <div ref={content}>
      {!messages.length && <div className={styles.welcome}><p className={styles.welcomeTitle}>Namastey, Devvrat.</p><p className={styles.welcomeText}>Want to know what’s new in blogs? Let’s find your next good read.</p></div>}
      {messages.map((message, index) => {
        const references = (message.sources || []).filter((source) => !messages.slice(0, index).some((earlier) => earlier.sources?.some((item) => item.url === source.url)));
        return <div key={index} className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}><div className={styles.bubble}>{message.role === "assistant" ? <AnuReveal text={message.text} animate={index === freshReply} /> : message.text}</div>
        {!!references.length && <div className={styles.sources}>{references.map((source) => <a key={source.url} href={`/blogs/${source.url.split("/").pop()}`} className={styles.source} aria-label={`Reference: ${source.title}`}>Reference</a>)}</div>}
      </div>; })}
      {busy && <p role="status" className={styles.thinking}>Anu is reading the blogs…</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
    </div>
    <div ref={composer} className={styles.composer}>
      {!messages.length && <div className={styles.prompts}>{prompts.map((prompt) => <button type="button" key={prompt} disabled={busy || !ready} onClick={() => void send(prompt)} className={styles.prompt}>{prompt}</button>)}</div>}
      <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className={styles.form}>
        <textarea ref={textarea} aria-label="Message Blogs Anu" placeholder="What’s on your mind?" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} rows={1} disabled={busy || !ready} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} className={styles.input} />
        <button type="submit" aria-label="Send to Anu" disabled={busy || !ready || !input.trim()} className={styles.send}><ArrowUp size={15} /></button>
      </form>
    </div>
  </section>;
}

export function BlogsAnuCompanion({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [height, setHeight] = useState(300);
  const resize = useCallback((next: number) => setHeight(next), []);
  useEffect(() => setMounted(true), []);
  const launcher = useRef<HTMLButtonElement>(null);
  const close = () => { setClosing(true); setOpen(false); launcher.current?.focus(); };
  useEffect(() => {
    if (!open || hidden) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); setClosing(true); setOpen(false); launcher.current?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, hidden]);
  if (hidden || !mounted) return null;
  return createPortal(<MotionConfig reducedMotion="user"><div className={styles.companion} style={{ position: "fixed", zIndex: 45 }}>
    <AnimatePresence initial={false} onExitComplete={() => setClosing(false)}>
      {open && <motion.div key="chat" initial={{ y: 6, scale: .99, height }} animate={{ y: 0, scale: 1, height }} exit={{ y: 4, scale: .99 }} transition={{ duration: .18, height: { duration: .28, ease: [.22, .61, .36, 1] }, ease: [.22, .61, .36, 1] }} className={styles.window} id="blogs-anu-conversation"><AnuPanel onClose={close} onHeight={resize} /></motion.div>}
    </AnimatePresence>
    <div className={styles.launcher}>
      {!open && !closing && <div className={styles.greeting} role="tooltip"><span className={styles.greetingTitle}><HoverText text="Namastey, Devvrat." /></span><p className={styles.greetingText}><HoverText text="Want to know what’s new in blogs?" /></p></div>}
      <motion.button ref={launcher} type="button" aria-label={open ? "Close Blogs Anu" : "Open Blogs Anu"} aria-expanded={open} aria-controls={open ? "blogs-anu-conversation" : undefined} onClick={() => { if (open) close(); else { setClosing(false); setOpen(true); } }} whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }} transition={{ duration: .14 }} className={styles.launchButton}><LivingDot /></motion.button>
    </div>
  </div></MotionConfig>, document.body);
}
