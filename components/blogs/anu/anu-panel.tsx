"use client";
/* eslint-disable @next/next/no-img-element -- The small launcher uses the canonical local SVG. */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpRight } from "lucide-react";
import styles from "./shared-anu.module.css";

type Focus = { kind: string; id: string };
type CompanionProps = { hidden?: boolean; area?: "blogs" | "feed" | "projects" | "clans"; focus?: Focus };
const subscribe = () => () => {};
function anuOrigin() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_ANU_URL || "https://anu.devvrats.in");
    const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol === "http:";
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (!local && url.origin !== "https://anu.devvrats.in")) return "https://anu.devvrats.in";
    return url.origin;
  } catch { return "https://anu.devvrats.in"; }
}

export function BlogsAnuCompanion({ hidden = false, focus }: CompanionProps) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const origin = anuOrigin();
  useEffect(() => {
    if (open && !hidden) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open, hidden, mounted]);
  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({ type: "anu:context", focus: focus || null }, origin);
    const ready = (event: MessageEvent) => { if (event.origin === origin && event.source === frame.current?.contentWindow && event.data?.type === "anu:ready") send(); };
    window.addEventListener("message", ready); send();
    return () => window.removeEventListener("message", ready);
  }, [origin, focus, open]);
  if (!mounted || hidden) return null;
  return createPortal(<>
    <button type="button" className={styles.launcher} onClick={() => setOpen(true)} aria-label="Open Anu" aria-haspopup="dialog"><img src="/brands/anu-orb.svg" alt="" width={48} height={48} /></button>
    <dialog ref={dialog} className={styles.dialog} aria-label="Anu, your Devvrats companion" onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <header className={styles.header}><a href={origin} target="_blank" rel="noreferrer">Open Anu <ArrowUpRight size={13} /></a><button type="button" autoFocus aria-label="Close Anu" onClick={() => setOpen(false)}><X size={19} /></button></header>
      {open && <iframe ref={frame} src={`${origin}/embed`} title="Anu chat" className={styles.frame} referrerPolicy="strict-origin-when-cross-origin" allow="clipboard-write" />}
    </dialog>
  </>, document.body);
}
