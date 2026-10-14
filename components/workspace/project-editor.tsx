"use client";
import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";
import { createAccountProject, updateAccountProject } from "@/app/projects/actions";
import { PROJECT_STAGES, type Project, type ProjectInput } from "@/lib/projects/types";
import type { ProjectDraft } from "./project-drafts";

export default function ProjectEditor({ project, localDraft, canChangeVisibility = true }: { project?: Project; localDraft?: ProjectDraft; canChangeVisibility?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: project?.name ?? localDraft?.name ?? "", tagline: project?.tagline ?? localDraft?.tagline ?? "", description: project?.description ?? localDraft?.description ?? "", technologies: project?.technologies.join(", ") ?? localDraft?.technologies ?? "", visibility: project?.visibility ?? localDraft?.visibility ?? "private", stage: project?.stage ?? "idea" });
  const [current, setCurrent] = useState(project);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const operation = useRef<{ id: string; name: string } | null>(null);
  const update = (key: keyof typeof form, value: string) => { setForm((old) => ({ ...old, [key]: value })); setSaved(false); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null); setConflict(false);
    if (!operation.current) operation.current = { id: localDraft?.id ?? crypto.randomUUID(), name: localDraft?.name ?? form.name };
    const input: ProjectInput = { ...form, technologies: form.technologies.split(",").map((tech) => tech.trim()).filter(Boolean) };
    const request = operation.current;
    startTransition(async () => {
      try {
        const result = current ? await updateAccountProject(current.id, current.version, input) : await createAccountProject(input, request.id, request.name);
        if (!result.ok) { setError(result.error); setConflict(result.code === "40001"); return; }
        setCurrent(result.project); setSaved(true);
        if (!current) router.replace(`/projects/${result.project.slug}`);
        else router.refresh();
      } catch { setError("Your save couldn’t be confirmed. Your text is still here; try saving again."); }
    });
  };
  return <><header className="dv-page-intro"><div><p className="dv-eyebrow">{project ? "Project details" : localDraft ? "Bring your draft with you" : "A new beginning"}</p><h1>{project ? "Shape your project." : "What are you building?"}</h1><p>{localDraft ? "Save this browser draft to your account. The original browser copy will be kept." : "Give your work a name, a purpose, and room to grow."}</p></div><span className="dv-pill">{current?.publication_status === "published" ? "Published project" : "Account draft"}</span></header>
    <form className="dv-surface dv-form" onSubmit={save}><fieldset disabled={pending || !!project?.archived_at} className="dv-fieldset">
      <label className="dv-field">Project name<input className="dv-input" value={form.name} onChange={(event) => update("name", event.target.value)} required minLength={2} maxLength={80} placeholder="Give your idea a name" /></label>
      <label className="dv-field">In a sentence<input className="dv-input" value={form.tagline} onChange={(event) => update("tagline", event.target.value)} maxLength={180} placeholder="What are you making, and who is it for?" /></label>
      <label className="dv-field">The idea<textarea className="dv-input" value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={10000} rows={6} placeholder="The problem, the possibility, and what you want to build." /><small>{form.description.length.toLocaleString("en-US")} / 10,000 characters</small></label>
      <label className="dv-field">Technologies<input className="dv-input" value={form.technologies} onChange={(event) => update("technologies", event.target.value)} maxLength={820} placeholder="React, TypeScript, Python…" /><small>Up to 20 technologies, separated by commas.</small></label>
      <label className="dv-field">Project stage<select className="dv-input" value={form.stage} onChange={(event) => update("stage", event.target.value)}>{PROJECT_STAGES.map((stage) => <option key={stage} value={stage}>{stage[0].toUpperCase() + stage.slice(1)}</option>)}</select></label>
      <label className="dv-field">Visibility<select className="dv-input" value={form.visibility} onChange={(event) => update("visibility", event.target.value)} disabled={!canChangeVisibility}><option value="private">Private — your project team</option><option value="public">Public — everyone after publishing</option></select><small>{!canChangeVisibility ? "Only the owner can change visibility." : current?.publication_status === "published" ? "Changing visibility changes who can see this published project." : "Drafts stay unpublished even when public visibility is selected."}</small></label>
      {current && <p className="dv-note dv-permalink">Permanent URL: /projects/{current.slug}</p>}
      <div className="dv-form-footer"><span className="dv-note">{current?.publication_status === "published" ? "Saving updates the published project." : "Saved to your account. Publishing is a separate step."}</span><button type="submit" className="dv-button dv-button-primary" disabled={form.name.trim().length < 2}>{saved ? <Check size={14} /> : <Save size={14} />}{pending ? "Saving…" : "Save project"}</button></div>
    </fieldset>
    {project?.archived_at && <p role="status" className="dv-status">This project is archived and read-only.</p>}
    {error && <div className="dv-status dv-error" role="alert">{error}{conflict && <p>Your unsaved text is kept here. Copy any changes you want to keep before <button type="button" className="dv-text-button" onClick={() => window.location.reload()}>reloading the latest version</button>.</p>}</div>}
    {saved && !error && <p role="status" className="dv-status">Saved to your account. <Link href={`/projects/${current?.slug}`}>View project</Link></p>}
    </form>
  </>;
}
