"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowUpRight, Folder, Plus, Search } from "lucide-react";
import { loadProjectPage } from "@/app/projects/actions";
import ProjectShowcaseCard from "./project-showcase-card";
import type { Project, ProjectProfile } from "@/lib/projects/types";
import { useWorkspaceUser } from "./workspace-shell";
import ProjectEmptyArt from "./project-empty-art";
import { useProjectDrafts } from "./project-drafts";

export default function ProjectsHome({ mine, initialProjects, initialProfiles, initialHasMore, loadError }: { mine: boolean; initialProjects: Project[]; initialProfiles:ProjectProfile[]; initialHasMore: boolean; loadError: string | null }) {
  const router = useRouter();
  const { user, loading } = useWorkspaceUser();
  const drafts = useProjectDrafts(user?.id);
  const [projects, setProjects] = useState(initialProjects);
  const [profiles,setProfiles]=useState(initialProfiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visible = projects.filter((project) => `${project.name} ${project.tagline} ${project.technologies.join(" ")}`.toLowerCase().includes(query.toLowerCase().trim()));
  const older = () => {
    const last = projects.at(-1);
    if (!last || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await loadProjectPage(mine ? "mine" : "public", { id: last.id, createdAt: last.created_at });
        if (!result.ok) { setError(result.error); return; }
        setProjects((current) => [...current, ...result.projects.filter((item) => !current.some((project) => project.id === item.id))]); setHasMore(result.hasMore);setProfiles(old=>[...old,...result.profiles.filter(p=>!old.some(o=>o.id===p.id))]);
      } catch { setError("More projects couldn’t load. Please try again."); }
    });
  };
  return <div className="dv-enter">
    <header className="dv-page-intro"><div><p className="dv-eyebrow">Devvrats / Projects</p><h1>{mine ? "Your workspace" : "Projects"}</h1><p>{mine ? "Your drafts, your projects, and the work you’re building together." : "Explore the work taking shape in Devvrats."}</p></div><Link href="/projects/new" className="dv-button dv-button-primary"><Plus size={15} />Start a project</Link></header>
    <div className="dv-toolbar"><nav className="dv-tabs" aria-label="Project collection"><Link href="/projects" aria-current={!mine ? "page" : undefined}>Discover</Link><Link href="/projects?view=mine" aria-current={mine ? "page" : undefined}>Your projects</Link></nav>{projects.length > 0 && <label className="dv-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search loaded projects" placeholder="Find a project…" /></label>}</div>
    {query && hasMore && <p className="dv-note">Searching the projects loaded here. Load more to include older projects.</p>}
    <div className="dv-section-title"><h2><Folder size={18} />{mine ? "Your projects" : "Around the community"}</h2><span>{mine ? "Saved to your account" : "Published public projects"}</span></div>
    {loadError ? <section className="dv-surface dv-empty" role="alert"><h2>Projects are unavailable.</h2><p>{loadError}</p><button type="button" className="dv-button" onClick={() => router.refresh()}>Try again</button></section> : visible.length ? <div className="dv-showcase-list">{visible.map(project=><ProjectShowcaseCard key={project.id} project={project} owner={profiles.find(p=>p.id===project.owner_id)}/>)}</div> : <section className="dv-surface dv-empty"><ProjectEmptyArt/><h2>{query ? "No matching projects in this collection." : mine ? "Your first project starts here" : "A home for what you’re building"}</h2><p>{query ? "Try a different name or technology, or load more projects below." : mine ? "Save your first idea as an account draft. It will be here when you return, on any device." : "Published public projects will appear here. Start shaping one of your own."}</p>{!query && <Link href="/projects/new" className="dv-button"><Plus size={14} />Start a project</Link>}</section>}
    {hasMore && <div className="dv-load-more"><button type="button" className="dv-button" disabled={pending} onClick={older}>{pending ? "Loading…" : "Load more projects"}</button></div>}{error && <p role="alert" className="dv-status dv-error">{error}</p>}
    {mine && !loading && drafts.length > 0 && <section className="dv-browser-drafts"><div className="dv-section-title"><h2>Browser copies</h2><span>Kept on this device</span></div><p className="dv-note">Open a copy to save or reopen its account project. Your original browser copies are kept.</p><div className="dv-grid">{drafts.map((draft) => <Link key={draft.id} href={`/projects/new?draft=${encodeURIComponent(draft.id)}`} className="dv-surface dv-card"><div className="dv-card-icon"><Folder size={20} /><ArrowUpRight size={15} /></div><h3>{draft.name}</h3><p>{draft.tagline || "A draft from this browser."}</p><span className="dv-pill">Open browser copy</span></Link>)}</div></section>}
  </div>;
}
