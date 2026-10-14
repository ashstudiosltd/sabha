import "server-only";
import { GitHubError, reportGitHubError } from "./errors";
import { admin, github, installationToken, type Repository } from "./app";
export interface Connection { project_id:string; connection_id:string; installation_id:number; repository_id:number; full_name:string; default_branch:string; sync_status:string; synced_at:string|null }
export interface ActivityDay { date:string; count:number }
export async function syncRepository(connection:Connection) {
 const db=admin();
 // Serialize a repository refresh across webhooks and scheduled reconciliation.
 const lease=await db.rpc("claim_project_github_sync",{p_project_id:connection.project_id,p_connection_id:connection.connection_id});
 if(lease.error) throw new GitHubError("sync-storage", "GitHub sync storage is unavailable. Check the Supabase GitHub migration.", "claim-sync");
 if(!lease.data) return;
 const leaseId=lease.data as string;
 try {
  const token=await installationToken(connection.installation_id,connection.repository_id);
  const {data:repo}=await github<Repository>(`/repositories/${connection.repository_id}`,token);
  if(repo.id!==Number(connection.repository_id)) throw new Error("Repository mismatch");
  const path=repo.full_name.split("/").map(encodeURIComponent).join("/");
  const stats=await github<{week:number;days:number[];total:number}[]>(`/repos/${path}/stats/commit_activity`,token);
  const ready=stats.status===200 && Array.isArray(stats.data);
  const activity:ActivityDay[]=ready?stats.data.flatMap(w=>w.days.map((count,index)=>({date:new Date((w.week+index*86400)*1000).toISOString().slice(0,10),count}))):[];
  if(activity.some(d=>!Number.isSafeInteger(d.count)||d.count<0)) throw new Error("Invalid activity");
  const {error}=await db.rpc("finish_project_github_sync",{p_project_id:connection.project_id,p_connection_id:connection.connection_id,p_lease:leaseId,p_full_name:repo.full_name,p_branch:repo.default_branch,p_private:repo.private,p_stars:repo.stargazers_count,p_forks:repo.forks_count,p_activity:activity,p_ready:ready});
  if(error) throw new GitHubError("sync-storage", "GitHub activity couldn’t be stored. Check the Supabase GitHub migration.", "finish-sync");
 } catch (cause) {
  await db.from("project_github_connections").update({public_ready:false,sync_status:"unavailable",sync_lease:null,sync_started_at:null}).eq("project_id",connection.project_id).eq("connection_id",connection.connection_id).eq("sync_lease",leaseId);
  throw reportGitHubError(cause, "sync");
 }
}
