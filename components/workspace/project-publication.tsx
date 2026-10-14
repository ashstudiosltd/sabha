"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeProjectPublication } from "@/app/projects/actions";
import type { Project } from "@/lib/projects/types";
export default function ProjectPublication({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const published = project.publication_status === "published";
  const change = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await changeProjectPublication(project.id, project.version, !published);
        if (!result.ok) { setError(result.error); return; }
        setConfirm(false); router.refresh();
      } catch { setError("Your publishing change couldn’t be confirmed. Reload to check the latest status."); }
    });
  };
  return <div className="dv-publishing"><button type="button" className={published ? "dv-button" : "dv-button dv-button-primary"} disabled={pending || !!project.archived_at} onClick={() => setConfirm(!confirm)}>{published ? "Unpublish" : "Publish project"}</button>{confirm && <div className="dv-surface dv-publish-confirm"><strong>{published ? "Return to draft?" : project.visibility === "public" ? "Publish to the community?" : "Publish to your project team?"}</strong><p>{published ? "This removes the project from discovery. Only you and your maintainers can read the draft." : project.visibility === "public" ? "Anyone will be able to read this project, including visitors who aren’t signed in." : "Your project stays private. Publishing makes it available to your project contributors."}</p><div className="dv-pills"><button type="button" className="dv-button" disabled={pending} onClick={() => setConfirm(false)}>Cancel</button><button type="button" className="dv-button dv-button-primary" disabled={pending} onClick={change}>{pending ? "Updating…" : published ? "Return to draft" : "Confirm publish"}</button></div></div>}{error && <p className="dv-status dv-error" role="alert">{error} <button type="button" className="dv-text-button" onClick={() => router.refresh()}>Refresh status</button></p>}</div>;
}
