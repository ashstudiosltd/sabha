"use client";
import ProjectSelect from "@/components/workspace/project-select";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, Folder } from "lucide-react";
import { moreCatalog } from "@/app/projects/catalog-actions";
import type { CatalogCursor,CatalogFilters } from "@/lib/projects/catalog";
import { PROJECT_STAGES,type Project,type ProjectProfile } from "@/lib/projects/types";
import ProjectShowcaseCard from "./project-showcase-card";
import ProjectEmptyArt from "./project-empty-art";
import { useWorkspaceUser } from "./workspace-shell";
import { useProjectDrafts } from "./project-drafts";
export default function ProjectsCatalog({filters,initial,error:loadError,counts}:{filters:CatalogFilters;initial:{projects:Project[];profiles:ProjectProfile[];next:CatalogCursor|null};error:string|null;counts?:Record<string,number>|null}){
 const mine=filters.scope==="mine";const path=mine?"/projects/workspace":"/projects";
 const router=useRouter();const {user,loading}=useWorkspaceUser();const drafts=useProjectDrafts(user?.id);
 const [projects,setProjects]=useState(initial.projects);const [profiles,setProfiles]=useState(initial.profiles);const [next,setNext]=useState(initial.next);const [error,setError]=useState("");const [pending,start]=useTransition();const lock=useRef(false);
 function href(status:string){const p=new URLSearchParams();if(filters.q)p.set("q",filters.q);if(filters.stage)p.set("stage",filters.stage);if(filters.technology)p.set("technology",filters.technology);if(filters.relation!=="all")p.set("relation",filters.relation);p.set("sort",filters.sort);if(status!=="all")p.set("status",status);return `${path}?${p}`;}
 function load(){if(!next||lock.current)return;lock.current=true;start(async()=>{try{const result=await moreCatalog(filters,next);if(!result.ok){setError(result.error);return;}setProjects(old=>[...old,...result.projects.filter(p=>!old.some(o=>o.id===p.id))]);setProfiles(old=>[...old,...result.profiles.filter(p=>!old.some(o=>o.id===p.id))]);setNext(result.next);setError("");}catch{setError("More projects couldn’t load. Try again.");}finally{lock.current=false;}});}
 const filtered=!!filters.q||!!filters.stage||!!filters.technology||filters.status!=="all"||filters.relation!=="all";
 return <div className="dv-enter"><header className="dv-page-intro"><div><p className="dv-eyebrow">{mine?"Your work":"Devvrats community"}</p><h1>{mine?"Your workspace":"Explore projects"}</h1><p>{mine?"Pick up a draft, follow your team’s work, or manage a published project.":"Find projects by what they’re building, the tools they use, and their progress."}</p></div></header>
 {mine&&<nav className="dv-catalog-states" aria-label="Workspace status and account totals">{["all","draft","published","archived"].map(state=><Link key={state} href={href(state)} aria-current={filters.status===state?"page":undefined}><span>{state==="all"?"All projects":state==="draft"?"Drafts":state[0].toUpperCase()+state.slice(1)}</span>{counts&&<strong>{counts[state]??0}</strong>}</Link>)}</nav>}
 <form className="dv-catalog-filters" action={path} method="get"><label className="dv-search"><Search size={16}/><input name="q" defaultValue={filters.q} maxLength={100} placeholder={mine?"Search your projects":"Search projects"} aria-label="Search project names, descriptions, or technologies"/></label>
 <label>Stage<ProjectSelect aria-label="Stage" className="dv-input" name="stage" defaultValue={filters.stage}><option value="">Any stage</option>{PROJECT_STAGES.map(s=><option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</ProjectSelect></label>
 <label>Technology<input className="dv-input" name="technology" defaultValue={filters.technology} maxLength={40} placeholder="e.g. typescript"/></label>
 {mine&&<label>Relationship<ProjectSelect aria-label="Relationship" className="dv-input" name="relation" defaultValue={filters.relation}><option value="all">All my projects</option><option value="owned">Owned by me</option><option value="collaborating">Collaborating</option></ProjectSelect></label>}
 <label>Sort<ProjectSelect aria-label="Sort" className="dv-input" name="sort" defaultValue={filters.sort}><option value="recent">Recently updated</option><option value="newest">Newest first</option><option value="relevance">Best match</option><option value="name">Name A–Z</option></ProjectSelect></label>{mine&&<input type="hidden" name="status" value={filters.status}/>}
 <button className="dv-button" type="submit">Apply</button>{filtered&&<Link className="dv-button" href={path}>Clear</Link>}</form>

 {loadError?<section className="dv-surface dv-empty" role="alert"><h2>Projects couldn’t load</h2><p>{loadError}</p><button className="dv-button" onClick={()=>router.refresh()}>Try again</button></section>:projects.length?<div className="dv-showcase-list">{projects.map(p=><ProjectShowcaseCard key={p.id} project={p} owner={profiles.find(o=>o.id===p.owner_id)} workspace={mine}/>)}</div>:<section className="dv-surface dv-empty"><ProjectEmptyArt/><h2>{filtered?"No projects match these filters":mine?"Start your first project":"The community’s next project starts here"}</h2><p>{filtered?"Try another stage, technology, or search phrase.":mine?"Save an idea to your account and return to it when you’re ready.":"Publish a public project to share your work with Devvrats."}</p><Link className="dv-button" href={filtered?path:"/projects/new"}>{filtered?"Clear filters":"Create a project"}</Link></section>}
 {next&&!loadError&&<div className="dv-load-more"><button className="dv-button" disabled={pending} onClick={load}>{pending?"Loading projects…":"Load more"}</button></div>}{error&&<p className="dv-error" role="alert">{error}</p>}
 {mine&&!loading&&drafts.length>0&&<section className="dv-browser-drafts"><div className="dv-section-title"><h2>Browser copies</h2><span>On this device</span></div><p className="dv-note">Original browser drafts are kept separately from account projects.</p><div className="dv-grid">{drafts.map(d=><Link className="dv-surface dv-card" key={d.id} href={`/projects/new?draft=${encodeURIComponent(d.id)}`}><div className="dv-card-icon"><Folder size={20}/><ArrowUpRight size={15}/></div><h3>{d.name}</h3><p>{d.tagline||"A draft kept in this browser."}</p><span className="dv-pill">Open browser copy</span></Link>)}</div></section>}
 </div>;
}
