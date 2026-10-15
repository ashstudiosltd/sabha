import ProjectSelect from "@/components/workspace/project-select";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects/server";
import { catalogFilters,readCatalog } from "@/lib/projects/catalog";
import ProjectTimeline from "@/components/workspace/project-timeline";
import { projectEventPage } from "../workspace-actions";
export const dynamic="force-dynamic";
export const metadata={title:"Your activity"};
export default async function ProjectActivityPage({searchParams}:{searchParams:Promise<{project?:string;kind?:string}>}){
 const raw=await searchParams;const slug=typeof raw.project==="string"&&raw.project.length<=80?raw.project:null;const kind=["project","people"].includes(raw.kind??"")?raw.kind!:"all";
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect(`/auth?next=${encodeURIComponent(`/projects/activity${slug?`?project=${encodeURIComponent(slug)}`:""}`)}`);
 const [history,recent,selected]=await Promise.all([projectEventPage(slug,undefined,kind),readCatalog(catalogFilters({sort:"recent"},"mine")).catch(()=>null),slug?getProjectBySlug(slug):Promise.resolve(null)]);
 const options=recent?.projects??[];if(selected&&!options.some(p=>p.id===selected.id))options.push(selected);
 return <><header className="dv-page-intro"><div><p className="dv-eyebrow">Your work, in context</p><h1>{selected?`${selected.name} activity`:"Your activity"}</h1><p>Follow project changes, publishing milestones, and team updates.</p></div><Link className="dv-button" href={selected?`/projects/${selected.slug}?tab=activity`:"/projects/workspace"}>{selected?"Open project history":"Your workspace"}</Link></header>
 <form className="dv-catalog-filters dv-activity-filters" action="/projects/activity" method="get"><label>Project<ProjectSelect aria-label="Project" className="dv-input" name="project" defaultValue={slug??""}><option value="">All managed projects</option>{options.map(p=><option key={p.id} value={p.slug}>{p.name}</option>)}</ProjectSelect></label><label>Changes<ProjectSelect aria-label="Changes" className="dv-input" name="kind" defaultValue={kind}><option value="all">All changes</option><option value="project">Project milestones</option><option value="people">Team and ownership</option></ProjectSelect></label><button className="dv-button" type="submit">Apply</button>{(slug||kind!=="all")&&<Link className="dv-button" href="/projects/activity">Clear</Link>}</form>
 {recent&&recent.projects.length>0&&!slug&&<section className="dv-surface dv-workspace-section"><h2>Recently updated projects</h2><ul className="dv-recent-projects">{recent.projects.slice(0,6).map(p=><li key={p.id}><Link href={`/projects/activity?project=${encodeURIComponent(p.slug)}`}><strong>{p.name}</strong><span>{p.stage} · {p.publication_status}</span></Link><time dateTime={p.updated_at}>{p.updated_at.slice(0,10)}</time></li>)}</ul><p className="dv-note">Choose a project for its timeline. The selector lists your recently updated projects; any project’s workspace also links directly to its history.</p></section>}
 <ProjectTimeline key={`${slug}:${kind}`} slug={slug} kind={kind} initial={history}/></>;
}
