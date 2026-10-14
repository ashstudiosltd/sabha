"use client";

import { useRouter } from "next/navigation";

import styles from "./feed-experience.module.css";

export type FeedMode = "conversation" | "project" | "clans";

export default function FeedModeSwitch({ active, query = "" }: { active: FeedMode; query?: string }) {
  const router = useRouter();
  const changeMode = (mode: FeedMode) => {
    const params = new URLSearchParams();
    const currentQuery = query.trim() || new URLSearchParams(window.location.search).get("q")?.trim() || "";
    if (currentQuery) params.set("q", currentQuery);
    params.set("view", mode);
    router.push(`/feed?${params.toString()}`, { scroll: false });
  };

  return (
    <fieldset className={styles.feedMode} aria-label="Feed view">
      <button type="button" onClick={() => changeMode("conversation")} aria-pressed={active === "conversation"}>
        Conversations
      </button>
      <button type="button" onClick={() => changeMode("project")} aria-pressed={active === "project"}>
        Project updates
      </button>
      <button type="button" onClick={() => changeMode("clans")} aria-pressed={active === "clans"}>
        Clans
      </button>
    </fieldset>
  );
}
