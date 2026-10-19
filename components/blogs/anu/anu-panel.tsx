"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnuActionCard, type ActionPreview } from "@/components/anu/action-card";
import { createClient } from "@/lib/supabase/client";
import styles from "./anu-panel.module.css";
import "./anu-orb.css";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { AnuReveal } from "./anu-summary";
import { ArrowUp, Trash2, X } from "lucide-react";

type Source = { title: string; url: string };
type Message = { role: "user" | "assistant"; text: string; sources?: Source[]; action?: ActionPreview };
const STORAGE = "sabha-anu-blogs-v1";

function LivingDot() {
  return <span className={`living-dot dot-idle ${styles.orb}`} aria-hidden="true"><span className="dot-halo" /><span className="dot-body"><i /></span></span>;
}

function HoverText({ text }: { text: string }) {
  return <>{text.split(" ").map((word, index) => <span key={index}><span className={styles.hoverWord} style={{ "--word-delay": `${index * 16}ms` } as CSSProperties}>{word}</span>{" "}</span>)}</>;
}

function turnId() {
  if(typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function sourceValid(source: Source) {
 if(!source || typeof source.title!=="string" || typeof source.url!=="string")return false;
 try { const url=new URL(source.url);return url.protocol==="https:"&&!url.username&&!url.password&&((url.hostname==="sabha.devvrats.in"&&/^\/(?:blogs\/[a-zA-Z0-9-]+|projects\/[a-zA-Z0-9-]+|feed\/[a-zA-Z0-9-]+|feed\/clans\/[a-zA-Z0-9-]+|notifications)$/.test(url.pathname))||(url.hostname==="github.com"&&/^\/[^/]+\/[^/]+\/(?:(?:tree|blob)\/[a-f0-9]{40}(?:\/.*)?|commit\/[a-f0-9]{40}|(?:issues|pull)\/[1-9][0-9]*)$/i.test(url.pathname))); }catch{return false;}
}
function historyFor(messages: Message[]) {
  const history = messages.slice(-20).map(({ role, text }) => ({ role, text: text.slice(0, 4000) }));
  while (JSON.stringify(history).length > 24_000) history.shift();
  // The model's first context message should be a user turn.
  while (history[0]?.role === "assistant") history.shift();
  return history;
}

type Focus = { kind: string; id: string };
type CompanionProps = { hidden?: boolean; area?: "blogs" | "feed" | "projects" | "clans"; focus?: Focus };
function AnuPanel({ onClose, onHeight, userId, area, focus }: { onClose: () => void; onHeight: (height: number) => void; userId: string | null; area: string; focus?: Focus }) {
  const key = focus ? `${focus.kind}:${focus.id}` : area;
  const [notice, setNotice] = useState("");
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
    let active = true;
    setReady(false);
    if (userId) {
      void fetch(`/api/anu/history?scope=${encodeURIComponent(key)}`, { cache: "no-store" }).then(async response => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) { setNotice("Replies work now; account history will be available after setup."); return; }
        setMessages((data.turns || []).flatMap((turn: {question: string; answer: string; sources: Source[]}): Message[] => [{role:"user",text:turn.question},{role:"assistant",text:turn.answer,sources:turn.sources}]).slice(-40));
      }).catch(() => { if(active) setNotice("History couldn’t load. You can still talk to Anu."); }).finally(() => {if(active)setReady(true);});
    } else {
      try { const stored=JSON.parse(sessionStorage.getItem(STORAGE)||"{}")[key]; if(Array.isArray(stored))setMessages(stored.filter(item=>item&&["user","assistant"].includes(item.role)&&typeof item.text==="string").slice(-20)); } catch { /* Guest preview works without storage. */ }
      setReady(true);
    }
    return () => { active=false; controller.current?.abort(); controller.current=null; };
  }, [key, userId]);

  useEffect(() => {
    if(!ready||userId)return;
    try { sessionStorage.setItem(STORAGE,JSON.stringify({[key]:messages.slice(-20)})); } catch { /* Guest preview remains usable. */ }
  }, [key,messages,ready,userId]);

  async function clearHistory() {
    if (sending.current) return;
    if(userId){
      try { const response=await fetch(`/api/anu/history?scope=${encodeURIComponent(key)}`,{method:"DELETE"});if(!response.ok)throw new Error(); }
      catch { setError("The conversation couldn’t be cleared. Please try again.");return; }
    }
    setMessages([]);setError("");setNotice("");
  }

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
      const response = await fetch(userId ? "/api/anu/chat" : "/api/anu/blogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(userId ? { message: question, focus, scope: key, turnId: turnId() } : { message: question, history: historyFor(previous), articleId: null }), signal: abort.signal });
      const data = await response.json();
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || "Anu couldn't reply. Please try again.");
      if (controller.current !== abort) return;
      const knownSources = new Set(previous.flatMap((message) => message.sources || []).map((source) => source.url));
      const sources = Array.isArray(data.sources) ? data.sources.filter((source: Source) => sourceValid(source) && !knownSources.has(source.url)) : [];
      if(data.actionNotice)setNotice(data.actionNotice);
      if(userId && !data.historySaved)setNotice("This reply wasn’t saved to your account.");
      setFreshReply(Math.min(previous.length + 1, 39));
      setMessages([...previous, { role: "user", text: question }, { role: "assistant", text: data.reply, sources, action: data.action || undefined }].slice(userId ? -40 : -20) as Message[]);
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
  const prompts = area === "blogs" ? ["What's new in blogs?", "Find a story for me"] : area === "projects" ? ["Help me understand this project", "Find a project for me"] : area === "clans" ? ["Help me catch up in this Clan", "What could I contribute?"] : ["What is the community discussing?", "Help me find a conversation"];
  return <section aria-label="Talk to Anu" className={styles.panel}>
    <div ref={header} className={styles.header}>
      {!!messages.length && <button type="button" aria-label="Clear this conversation" title="Clear this conversation" disabled={busy} onClick={() => void clearHistory()} className={styles.iconButton}><Trash2 size={15}/></button>}

      <button type="button" aria-label="Close conversation" onClick={onClose} className={styles.iconButton}><X size={17} /></button>
    </div>
    <div ref={scroll} onScroll={() => { const el = scroll.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className={styles.log} role="log" aria-label="Conversation with Anu" aria-live="polite" aria-busy={busy}>
      <div ref={content}>
      {!messages.length && <div className={styles.welcome}><p className={styles.welcomeTitle}>Namastey, Devvrat.</p><p className={styles.welcomeText}>{area === "blogs" ? "Let’s find your next good read." : area === "projects" ? "Let’s explore what you’re building." : "Let’s find your place in the conversation."}</p></div>}
      {messages.map((message, index) => {
        const references = (message.sources || []).filter(sourceValid).filter((source) => !messages.slice(0, index).some((earlier) => earlier.sources?.some((item) => item.url === source.url)));
        return <div key={index} className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}><div className={styles.bubble}>{message.role === "assistant" ? <AnuReveal text={message.text} animate={index === freshReply} /> : message.text}</div>
        {message.action&&<AnuActionCard action={message.action}/>}
        {!!references.length && <div className={styles.sources}>{references.map((source) => <a key={source.url} href={new URL(source.url).hostname === "github.com" ? source.url : new URL(source.url).pathname} className={styles.source} aria-label={`Reference: ${source.title}`}>Reference</a>)}</div>}
      </div>; })}
      {busy && <p role="status" className={styles.thinking}>Anu is thinking…</p>}
      {notice && <p className={styles.thinking}>{notice}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
    </div>
    <div ref={composer} className={styles.composer}>
      {!messages.length && <div className={styles.prompts}>{prompts.map((prompt) => <button type="button" key={prompt} disabled={busy || !ready} onClick={() => void send(prompt)} className={styles.prompt}>{prompt}</button>)}</div>}
      <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className={styles.form}>
        <textarea ref={textarea} aria-label="Message Anu" placeholder="What’s on your mind?" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} rows={1} disabled={busy || !ready} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} className={styles.input} />
        <button type="submit" aria-label="Send to Anu" disabled={busy || !ready || !input.trim()} className={styles.send}><ArrowUp size={15} /></button>
      </form>
    </div>
  </section>;
}

export function BlogsAnuCompanion({ hidden = false, area = "blogs", focus }: CompanionProps) {
  const [identity, setIdentity] = useState<{id:string|null;ready:boolean}>({id:null,ready:false});
  useEffect(()=>{
    let active=true;
    const db=createClient();
    void db.auth.getUser().then(({data:{user}})=>{if(active)setIdentity({id:user?.id||null,ready:true});}).catch(()=>{if(active)setIdentity({id:null,ready:true});});
    const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{if(active)setIdentity({id:session?.user.id||null,ready:true});});
    return ()=>{active=false;subscription.unsubscribe();};
  },[]);
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
  if (hidden || !mounted || !identity.ready || (!identity.id && area !== "blogs")) return null;
  return createPortal(<MotionConfig reducedMotion="user"><div className={`${styles.companion} ${area === "projects" ? styles.dark : ""}`} style={{ position: "fixed", zIndex: 45 }}>
    <AnimatePresence initial={false} onExitComplete={() => setClosing(false)}>
      {open && <motion.div key="chat" initial={{ y: 6, scale: .99, height }} animate={{ y: 0, scale: 1, height }} exit={{ y: 4, scale: .99 }} transition={{ duration: .18, height: { duration: .28, ease: [.22, .61, .36, 1] }, ease: [.22, .61, .36, 1] }} className={styles.window} id="blogs-anu-conversation"><AnuPanel key={`${identity.id || "guest"}:${area}:${focus?.id || "home"}`} userId={identity.id} area={area} focus={focus} onClose={close} onHeight={resize} /></motion.div>}
    </AnimatePresence>
    <div className={styles.launcher}>
      {!open && !closing && <div className={styles.greeting} role="tooltip"><span className={styles.greetingTitle}><HoverText text="Namastey, Devvrat." /></span><p className={styles.greetingText}><HoverText text={area === "blogs" ? "Want to know what’s new in blogs?" : area === "projects" ? "Want to explore your next step?" : "Want to catch up with your community?"} /></p></div>}
      <motion.button ref={launcher} type="button" aria-label={open ? "Close Anu" : "Open Anu"} aria-expanded={open} aria-controls={open ? "blogs-anu-conversation" : undefined} onClick={() => { if (open) close(); else { setClosing(false); setOpen(true); } }} whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }} transition={{ duration: .14 }} className={styles.launchButton}><LivingDot /></motion.button>
    </div>
  </div></MotionConfig>, document.body);
}
