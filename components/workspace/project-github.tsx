import { GitBranch, GitFork, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/github/app";
import type { ActivityDay } from "@/lib/github/sync";
import GitHubControls from "./project-github-controls";
interface Summary { activity:ActivityDay[]; stars:number; forks:number; synced_at:string|null; sync_status:string }
export default async function ProjectGitHub({id,slug,owner,member,archived}:{id:string;slug:string;owner:boolean;member:boolean;archived:boolean}) {
 const db=await createClient();const {data,error}=await db.rpc("project_github_summary",{p_project_id:id});const summary=(data?.[0]??null) as Summary|null;
 if(!summary&&!owner)return null;
 const setup=configured()&&!error;
 const days=summary?.activity??[];
 const total=days.reduce((sum,d)=>sum+d.count,0);
 const maximum=Math.max(1,...days.map(d=>d.count));
 return <section className="dv-surface dv-github" aria-label="Repository activity"><div className="dv-github-heading"><h2><GitBranch size={18}/>Project activity</h2>{summary&&<div className="dv-github-counts"><span title="Repository stars"><Star size={14}/>{summary.stars}</span><span title="Repository forks"><GitFork size={14}/>{summary.forks}</span></div>}</div>
 {summary?.sync_status==="ready"&&days.length>0?<><p className="dv-note">{total.toLocaleString("en-US")} commits in the last year</p><div className="dv-activity-scroll" tabIndex={0} aria-label="Daily commit activity, scroll horizontally"><div className="dv-activity-grid" role="img" aria-label={`${total} commits across ${days.length} days`}>{days.map(day=><span key={day.date} className="dv-activity-cell" data-level={day.count===0?0:Math.min(4,Math.ceil(day.count/maximum*4))} title={`${day.date}: ${day.count} ${day.count===1?"commit":"commits"}`}/>)}</div></div><div className="dv-activity-caption"><span>Default branch · UTC · merge commits excluded</span><span className="dv-activity-legend">Less {[0,1,2,3,4].map(n=><i key={n} className="dv-activity-cell" data-level={n}/>)} More</span></div></>:<p className="dv-note">{!setup?"GitHub connection setup is pending.":summary?.sync_status==="unavailable"?"Repository activity is temporarily unavailable.":summary?.sync_status==="ready"?"No commits recorded yet.":summary?"GitHub is preparing this repository’s activity.":"Connect a repository to see how your project is growing."}</p>}
 {summary?.synced_at&&<p className="dv-note">Updated <time dateTime={summary.synced_at}>{summary.synced_at.replace("T"," ").slice(0,16)} UTC</time></p>}
 {owner&&!archived&&setup&&<a className="dv-button" href={`/api/github/start?project=${encodeURIComponent(slug)}`}>{summary?"Change repository":"Connect GitHub"}</a>}
 {setup&&(owner||member)&&<GitHubControls slug={slug} owner={owner&&!archived} connected={!!summary} member={member}/>}
 </section>;
}
