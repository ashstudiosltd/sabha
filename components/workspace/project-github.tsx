import { GitBranch, GitFork, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/github/app";
import type { ActivityDay } from "@/lib/github/sync";
import RepositoryActivityGraph from "./repository-activity-graph";
import GitHubControls from "./project-github-controls";
interface Summary { activity:ActivityDay[]; stars:number; forks:number; synced_at:string|null; sync_status:string }
export default async function ProjectGitHub({id,slug,owner,member,archived}:{id:string;slug:string;owner:boolean;member:boolean;archived:boolean}) {
 const db=await createClient();const {data,error}=await db.rpc("project_github_summary",{p_project_id:id});const summary=(data?.[0]??null) as Summary|null;
 if(!summary&&!owner)return null;
 const setup=configured()&&!error;
 const days=summary?.activity??[];
 const today=new Date().toISOString().slice(0,10);
 return <section className="dv-surface dv-github" aria-label="Repository activity"><div className="dv-github-heading"><h2><GitBranch size={18}/>Project activity</h2>{summary&&<div className="dv-github-counts"><span title="Repository stars"><Star size={14}/>{summary.stars}</span><span title="Repository forks"><GitFork size={14}/>{summary.forks}</span></div>}</div>
 {summary?.sync_status==="ready"&&days.length>0?<RepositoryActivityGraph slug={slug} days={days} interactive={owner||member} today={today}/>:<p className="dv-note">{!setup?"GitHub connection setup is pending.":summary?.sync_status==="unavailable"?"Repository activity is temporarily unavailable.":summary?.sync_status==="ready"?"No commits recorded yet.":summary?"GitHub is preparing this repository’s activity.":"Connect a repository to see how your project is growing."}</p>}
 {summary?.synced_at&&<p className="dv-note">Updated <time dateTime={summary.synced_at}>{summary.synced_at.replace("T"," ").slice(0,16)} UTC</time></p>}
 {owner&&!archived&&setup&&<a className="dv-button" href={`/api/github/start?project=${encodeURIComponent(slug)}`}>{summary?"Change repository":"Connect GitHub"}</a>}
 {setup&&(owner||member)&&<GitHubControls slug={slug} owner={owner&&!archived} connected={!!summary} member={member}/>}
 </section>;
}
