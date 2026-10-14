"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspaceUser } from "./workspace-shell";
import { useProjectDrafts } from "./project-drafts";
import ProjectEditor from "./project-editor";

export default function ProjectDraftForm() {
  const draftId = useSearchParams().get("draft");
  const { user, loading } = useWorkspaceUser();
  const drafts = useProjectDrafts(user?.id);
  const draft = drafts.find((item) => item.id === draftId);
  if (!draftId) return <ProjectEditor />;
  if (loading) return <div className="dv-loader" role="status">Opening your browser draft…</div>;
  if (!draft) return <section className="dv-surface dv-empty"><h2>This draft isn’t on this device.</h2><p>Browser drafts are available in the account and browser where you saved them.</p><Link href="/projects/new" className="dv-button">Start a new project</Link></section>;
  return <ProjectEditor key={draft.id} localDraft={draft} />;
}
