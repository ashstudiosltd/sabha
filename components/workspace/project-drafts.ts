"use client";
import { useMemo, useSyncExternalStore } from "react";

export interface ProjectDraft { id: string; name: string; tagline: string; description: string; technologies: string; visibility: "public" | "private"; updatedAt: string }
const EVENT = "devvrats-project-drafts";
export function draftStorageKey(userId?: string) { return `devvrats-project-drafts-v1:${userId || "guest"}`; }
function subscribe(onChange: () => void) { window.addEventListener("storage", onChange); window.addEventListener(EVENT, onChange); return () => { window.removeEventListener("storage", onChange); window.removeEventListener(EVENT, onChange); }; }
function parseDrafts(value: string): ProjectDraft[] {
  try {
    const rows: unknown = JSON.parse(value);
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is ProjectDraft => !!row && typeof row === "object" && typeof row.id === "string" && typeof row.name === "string" && typeof row.tagline === "string" && typeof row.description === "string" && typeof row.technologies === "string" && typeof row.updatedAt === "string" && (row.visibility === "public" || row.visibility === "private")).slice(0, 100);
  } catch { return []; }
}
export function useProjectDrafts(userId?: string) {
  const key = draftStorageKey(userId);
  const raw = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key) ?? "[]"; } catch { return "[]"; } }, () => "[]");
  return useMemo(() => parseDrafts(raw), [raw]);
}
export function saveProjectDraft(draft: ProjectDraft, userId?: string) {
  const key = draftStorageKey(userId);
  const current = parseDrafts(localStorage.getItem(key) ?? "[]");
  localStorage.setItem(key, JSON.stringify([draft, ...current.filter((item) => item.id !== draft.id)].slice(0, 100)));
  window.dispatchEvent(new Event(EVENT));
}
