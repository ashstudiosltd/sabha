"use client";
import ProjectSelect from "@/components/workspace/project-select";
import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Save } from "lucide-react";
import { createAccountProject, updateAccountProject } from "@/app/projects/actions";
import { parseProjectInput } from "@/lib/projects/validation";
import { useProjectUnsaved } from "./use-project-unsaved";
import { PROJECT_STAGES, type Project, type ProjectInput } from "@/lib/projects/types";
import type { ProjectDraft } from "./project-drafts";

export default function ProjectEditor({ project, localDraft, canChangeVisibility = true, embedded=false }: { project?: Project; localDraft?: ProjectDraft; canChangeVisibility?: boolean; embedded?:boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: project?.name ?? localDraft?.name ?? "", tagline: project?.tagline ?? localDraft?.tagline ?? "", description: project?.description ?? localDraft?.description ?? "", technologies: project?.technologies.join(", ") ?? localDraft?.technologies ?? "", visibility: project?.visibility ?? localDraft?.visibility ?? "private", stage: project?.stage ?? "idea" });
  const [baseline,setBaseline]=useState(()=>JSON.stringify(form));
  const dirty=JSON.stringify(form)!==baseline;
  const unsavedDialog=useProjectUnsaved(dirty);
  const saving=useRef(false);
  const [current, setCurrent] = useState(project);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [copied,setCopied]=useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const operation = useRef<{ id: string; name: string } | null>(null);
  const update = (key: keyof typeof form, value: string) => { setForm((old) => ({ ...old, [key]: value })); setSaved(false); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if(saving.current||pending||conflict)return;setError(null);
    try {parseProjectInput({...form,technologies:form.technologies.split(",").map(t=>t.trim()).filter(Boolean)});}catch(cause){setError(cause instanceof Error?cause.message:"Check the project details.");return;}
    saving.current=true;
    if (!operation.current) operation.current = { id: localDraft?.id ?? crypto.randomUUID(), name: localDraft?.name ?? form.name };
    const input: ProjectInput = { ...form, technologies: form.technologies.split(",").map((tech) => tech.trim()).filter(Boolean) };
    const request = operation.current;
    startTransition(async () => {
      try {
        const result = current ? await updateAccountProject(current.id, current.version, input) : await createAccountProject(input, request.id, request.name);
        if (!result.ok) { setError(result.error); setConflict(result.code === "40001"); return; }
        setCurrent(result.project); setSaved(true);setBaseline(JSON.stringify(form));
        if (!current) router.replace(`/projects/${result.project.slug}/edit`);
        else router.refresh();
      } catch { setError("Your save couldn’t be confirmed. Your text is still here; try saving again."); }
      finally{saving.current=false;}
    });
  };
  return <>{!embedded&&<header className="dv-page-intro"><div><p className="dv-eyebrow">{project ? "Project details" : localDraft ? "Bring your draft with you" : "New project"}</p><h1>{project ? "Edit project" : "Create a project"}</h1><p>{localDraft ? "Save this browser draft to your account. The original browser copy will be kept." : current?.publication_status === "published" ? "Saved changes update your published project." : "Save your draft to your account. Review and publish when you’re ready."}</p></div><span className="dv-pill">{current?.publication_status === "published" ? "Published project" : "Account draft"}</span></header>}
    {unsavedDialog}<form className={`dv-surface dv-form${embedded?" dv-settings-editor":""}`} onSubmit={save} aria-busy={pending}><fieldset disabled={pending || !!project?.archived_at} className="dv-fieldset">
      <label className="dv-field">Project name<input className="dv-input" value={form.name} onChange={(event) => update("name", event.target.value)} required minLength={2} maxLength={80} placeholder="Give your idea a name" /></label>
      <label className="dv-field">In a sentence<input className="dv-input" value={form.tagline} onChange={(event) => update("tagline", event.target.value)} maxLength={180} placeholder="What are you making, and who is it for?" /></label>
      <label className="dv-field">The idea<textarea className="dv-input" value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={10000} rows={6} placeholder="The problem, the possibility, and what you want to build." /><small>{form.description.length.toLocaleString("en-US")} / 10,000 characters</small></label>
      <label className="dv-field">Technologies<input className="dv-input" value={form.technologies} onChange={(event) => update("technologies", event.target.value)} maxLength={820} placeholder="React, TypeScript, Python…" /><small>Up to 20 technologies, separated by commas.</small></label>
      <label className="dv-field dv-stage-field">Project stage<ProjectSelect aria-label="Project stage" className="dv-input" value={form.stage} onValueChange={(value) => update("stage", value)}>{PROJECT_STAGES.map((stage) => <option key={stage} value={stage}>{stage[0].toUpperCase() + stage.slice(1)}</option>)}</ProjectSelect></label>
      <label className="dv-field dv-visibility-field">Visibility<ProjectSelect aria-label="Visibility" className="dv-input" value={form.visibility} onValueChange={(value) => update("visibility", value)} disabled={!canChangeVisibility}><option value="private">Private — your project team</option><option value="public">Public — everyone after publishing</option></ProjectSelect><small>{!canChangeVisibility ? "Only the owner can change visibility." : current?.publication_status === "published" ? "Changing visibility changes who can see this published project." : "Drafts stay unpublished even when public visibility is selected."}</small></label>
      {current&&<section className="dv-project-identifiers" aria-label="Project identifiers"><h3>Project identifiers</h3><p>Permanent references for sharing and integrations.</p><dl><div><dt>Project URL</dt><dd><Link href={`/projects/${current.slug}`}><code>/projects/{current.slug}</code></Link><button type="button" className="dv-copy-action" aria-label="Copy project URL" title="Copy project URL" onClick={async()=>{try{await navigator.clipboard.writeText(new URL(`/projects/${current.slug}`,window.location.origin).href);setCopied("Project URL copied.");}catch{setCopied("Copy the URL from the link above.");}}}>{copied==="Project URL copied."?<Check size={15}/>:<Copy size={15}/>}</button></dd></div><div><dt>Project ID</dt><dd><code>{current.id}</code><button type="button" className="dv-copy-action" aria-label="Copy project ID" title="Copy project ID" onClick={async()=>{try{await navigator.clipboard.writeText(current.id);setCopied("Project ID copied.");}catch{setCopied("Select the project ID above to copy it.");}}}>{copied==="Project ID copied."?<Check size={15}/>:<Copy size={15}/>}</button></dd></div></dl>{copied&&<p role="status">{copied}</p>}</section>}
      <div className="dv-form-footer"><span className="dv-note">{current?.publication_status === "published" ? "Saving updates the published project." : pending ? "Saving to your account…" : dirty ? "Unsaved changes" : current ? "All changes saved to your account" : "Your first save creates an account draft"}</span><button type="submit" className="dv-button dv-button-primary" disabled={pending || conflict || form.name.trim().length < 2 || (!!current && !dirty)}>{saved ? <Check size={14} /> : <Save size={14} />}{pending ? "Saving…" : current?.publication_status === "published" ? "Save changes" : "Save draft"}</button></div>
    </fieldset>
    {project?.archived_at && <p role="status" className="dv-status">This project is archived and read-only.</p>}
    {error && <div className="dv-status dv-error" role="alert">{error}{conflict && <p>Your unsaved text is kept here. Copy any changes you want to keep before <button type="button" className="dv-text-button" onClick={() => window.location.reload()}>reloading the latest version</button>.</p>}</div>}
    {current&&!dirty&&<div className="dv-editor-review"><p className="dv-note">{current.publication_status==="published"?"Review the published project and its visibility.":"Your draft stays unpublished until you confirm publishing on the project page."}</p><Link className="dv-button" href={`/projects/${current.slug}`}>{current.publication_status==="published"?"View project":"Review draft"}</Link></div>}
    {saved&&!error&&<p role="status" className="dv-status">Saved to your account.</p>}
    </form>
  </>;
}
