"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileText, Image as ImageIcon, Link2, MessageCircle, Send } from "lucide-react";

import styles from "@/components/feed/feed-experience.module.css";

export type SabhaPostType = "conversation" | "project";
export type SabhaResourceKind = "blog" | "project" | "github" | "readme" | "image" | "link";

export interface SabhaPostDraft {
  postType: SabhaPostType;
  title: string | null;
  body: string;
  resourceKind: SabhaResourceKind | null;
  resourceUrl: string | null;
  resourceLabel: string | null;
}

interface SabhaPostComposerProps {
  postType: SabhaPostType;
  onPostTypeChange: (type: SabhaPostType) => void;
  submitError?: string | null;
  onPublish: (draft: SabhaPostDraft) => Promise<boolean>;
}

export default function SabhaPostComposer({ postType, onPostTypeChange, submitError, onPublish }: SabhaPostComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [resourceKind, setResourceKind] = useState<SabhaResourceKind>("link");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceLabel, setResourceLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const updateBody = (nextBody: string) => {
    setBody(nextBody);
    requestAnimationFrame(() => {
      const field = bodyRef.current;
      if (!field) return;
      field.style.height = "auto";
      field.style.height = `${Math.min(field.scrollHeight, 360)}px`;
      field.style.overflowY = field.scrollHeight > 360 ? "auto" : "hidden";
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanBody = body.trim();
    const cleanTitle = title.trim();
    const cleanUrl = resourceUrl.trim();
    const cleanLabel = resourceLabel.trim();

    if (!cleanBody) return setError("Add a little more to start the conversation.");
    if (cleanBody.length > 10_000) return setError("Keep the post under 10,000 characters.");
    if (postType === "project" && !cleanTitle) return setError("Add a title for this project update.");
    if (cleanTitle.length > 140) return setError("Keep the title under 140 characters.");
    if (cleanUrl && (!/^https:\/\//i.test(cleanUrl) && !/^\/(blogs|sabha\/projects|projects)\/[\w./-]+$/.test(cleanUrl) || !cleanLabel)) {
      return setError("Add a label and a secure link for your reference.");
    }

    setBusy(true);
    setError(null);
    const published = await onPublish({
      postType,
      title: cleanTitle || null,
      body: cleanBody,
      resourceKind: cleanUrl ? resourceKind : null,
      resourceUrl: cleanUrl || null,
      resourceLabel: cleanUrl ? cleanLabel : null,
    });
    setBusy(false);
    if (!published) return;

    setTitle("");
    setBody("");
    setResourceUrl("");
    setResourceLabel("");
    if (bodyRef.current) {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.overflowY = "hidden";
    }
  };

  const isProject = postType === "project";

  return (
    <form className={`${styles.composer} sabha-surface`} onSubmit={handleSubmit}>
      <div className={styles.typeSwitch} role="group" aria-label="Choose post type">
        <button type="button" onClick={() => onPostTypeChange("conversation")} aria-pressed={!isProject} className={!isProject ? styles.typeActive : styles.typeButton}>
          <MessageCircle size={16} /> Conversation
        </button>
        <button type="button" onClick={() => onPostTypeChange("project")} aria-pressed={isProject} className={isProject ? styles.typeActive : styles.typeButton}>
          <FileText size={16} /> Project update
        </button>
      </div>

      <p className={styles.composeDescription}>{isProject ? "Share progress, decisions, and what you’re building with the community." : "Start a discussion, ask a question, or share an idea with the community."}</p>

      {isProject && (
        <input className={`sabha-field ${styles.titleField}`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your project update a title" maxLength={140} aria-label="Project update title" />
      )}
      <textarea
        ref={bodyRef}
        className={`sabha-field ${styles.bodyField}`}
        value={body}
        onChange={(event) => updateBody(event.target.value)}
        placeholder={isProject ? "What are you building, learning, or looking for feedback on?" : "What’s on your mind?"}
        maxLength={10_000}
        aria-label={isProject ? "Project update" : "Conversation"}
        rows={3}
      />

      <details className={styles.resourceDetails}>
        <summary><Link2 size={15} /> Add a reference</summary>
        <div className={styles.resourceFields}>
          <select className={`sabha-field ${styles.kindSelect}`} value={resourceKind} onChange={(event) => setResourceKind(event.target.value as SabhaResourceKind)} aria-label="Reference type">
            <option value="link">Link</option><option value="blog">Sabha blog</option><option value="project">Sabha project</option><option value="github">GitHub</option><option value="readme">README</option><option value="image">Image</option>
          </select>
          <input className={`sabha-field ${styles.resourceInput}`} value={resourceLabel} onChange={(event) => setResourceLabel(event.target.value)} placeholder="Reference name" maxLength={120} aria-label="Reference name" />
          <input className={`sabha-field ${styles.resourceInput}`} value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="https://… or a Sabha link" maxLength={2048} aria-label="Reference URL" inputMode="url" />
        </div>
        <p className={styles.hint}><ImageIcon size={13} /> Images can be linked here; direct uploads will follow with storage and access rules.</p>
      </details>

      {(error || submitError) && <p className={styles.error} role="alert">{error ?? submitError}</p>}
      <div className={styles.composerBottom}>
        <span>{body.length.toLocaleString()} / 10,000</span>
        <button className="sabha-button sabha-button-primary" type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish"}<Send size={15} /></button>
      </div>
    </form>
  );
}
