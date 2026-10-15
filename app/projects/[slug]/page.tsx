import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderCode, Code2, Activity, Users, Settings, LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectTeam } from "@/lib/projects/server";
import ProjectGitHub from "@/components/workspace/project-github";
import ProjectPublication from "@/components/workspace/project-publication";
import ProjectTeam from "@/components/workspace/project-team";
import ProjectSettings from "@/components/workspace/project-settings";
import ProjectTimeline from "@/components/workspace/project-timeline";
import { projectEventPage } from "../workspace-actions";
export const dynamic = "force-dynamic";
const tabs=[{id:"overview",label:"Overview",icon:LayoutDashboard},{id:"development",label:"Development",icon:Code2},{id:"activity",label:"Activity",icon:Activity},{id:"people",label:"People",icon:Users},{id:"settings",label:"Settings",icon:Settings}];
export default async function ProjectPage({ params,searchParams }: { params: Promise<{ slug: string }>;searchParams:Promise<{tab?:string}> }) {
 const [{slug},{tab:requested}]=await Promise.all([params,searchParams]);const tab=tabs.some(t=>t.id===requested)?requested:"overview";
 const project=await getProjectBySlug(slug);if(!project)notFound();
 const db=await createClient();const [{data:{user}},team]=await Promise.all([db.auth.getUser(),getProjectTeam(project.id)]);
 const role=project.owner_id===user?.id?"owner":team.find(m=>m.profile_id===user?.id)?.role;const owner=role==="owner";const canEdit=owner||role==="maintainer";
 return <><header className="dv-page-intro"><div><p className="dv-eyebrow">Devvrats / Project</p><h1>{project.name}</h1>{project.tagline&&<p>{project.tagline}</p>}</div><div className="dv-project-actions">{owner&&<ProjectPublication key={project.version} project={project}/>}</div></header>
 <nav className="dv-workspace-tabs" aria-label="Project workspace">{tabs.map(({id,label,icon:Icon})=><Link key={id} href={`/projects/${slug}${id==="overview"?"":`?tab=${id}`}`} aria-current={tab===id?"page":undefined}><Icon size={16}/>{label}</Link>)}</nav>
 {project.archived_at&&<p className="dv-status">This project is archived. Restore it from Settings to resume editing.</p>}
 {tab==="overview"&&<><section className="dv-surface dv-workspace-section"><h2><FolderCode size={20}/>Overview</h2><p className="dv-project-description">{project.description||"No description has been added."}</p>{canEdit&&!project.description&&!project.archived_at&&<Link href={`/projects/${slug}?tab=settings`} className="dv-button">Add a description</Link>}<div className="dv-project-facts"><div><small>Stage</small><strong>{project.stage}</strong></div><div><small>Team</small><Link href={`/projects/${slug}?tab=people`}>{team.length} {team.length===1?"person":"people"}</Link></div><div><small>Created</small><time dateTime={project.created_at}>{project.created_at.slice(0,10)}</time></div><div><small>Updated</small><time dateTime={project.updated_at}>{project.updated_at.slice(0,10)}</time></div></div><h3>Technologies</h3>{project.technologies.length?<div className="dv-pills">{project.technologies.map(t=><span className="dv-pill" key={t}>{t}</span>)}</div>:<p className="dv-note">No technologies listed.</p>}</section><ProjectGitHub id={project.id} slug={slug} owner={owner} member={!!role} archived={!!project.archived_at}/></>}
 {tab==="development"&&<><ProjectGitHub id={project.id} slug={slug} owner={owner} member={!!role} archived={!!project.archived_at}/><section className="dv-surface dv-workspace-section"><h2>Development</h2><p className="dv-note">Repository activity is scoped to this project’s connected default branch. Members can select a day to inspect its commits.</p><div className="dv-pills">{project.technologies.map(t=><span className="dv-pill" key={t}>{t}</span>)}</div><p className="dv-note">{owner?"Connect or change the repository using the activity panel above.":"The project owner manages the repository connection. Private repository activity is visible only to the project team."}</p><Link className="dv-button" href={`/projects/${slug}?tab=people`}>View project team</Link></section></>}
 {tab==="people"&&<ProjectTeam key={project.version} project={project} team={team} owner={owner}/>}
 {tab==="settings"&&(canEdit?<ProjectSettings key={project.version} project={project} team={team} owner={owner}/>:<section className="dv-surface dv-workspace-section"><h2>Project access</h2><p className="dv-note">Only the owner and maintainers can edit project settings. This project is {project.visibility} and {project.publication_status}.</p><Link className="dv-button" href={`/projects/${slug}?tab=people`}>View people and roles</Link></section>)}
 {tab==="activity"&&(canEdit?<ProjectTimeline slug={slug} initial={await projectEventPage(slug)}/>:<section className="dv-surface dv-workspace-section"><h2>Project milestones</h2><p>Created {project.created_at.slice(0,10)}</p>{project.published_at&&<p>Published {project.published_at.slice(0,10)}</p>}<p>Last updated {project.updated_at.slice(0,10)}</p><p className="dv-note">Detailed team history is restricted to the owner and maintainers.</p><Link className="dv-button" href={`/projects/${slug}?tab=development`}>Repository activity</Link></section>)}
 </>;
}
