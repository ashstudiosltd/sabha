"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects/server";
import { admin, configured, FLOW_COOKIE, unseal, repositories, installationToken, github } from "@/lib/github/app";
import { GitHubError, reportGitHubError } from "@/lib/github/errors";
import { syncRepository, type Connection } from "@/lib/github/sync";
async function owner(slug:string) {
 const db=await createClient();const {data:{user}}=await db.auth.getUser();const project=await getProjectBySlug(slug);
 if(!user||!project||project.owner_id!==user.id||project.archived_at)throw new Error("Only the owner can manage GitHub on an active project.");
 return {user,project,db};
}
export async function connectGitHub(slug:string,repositoryId:number,installationId:number) {
 try {
  if(!configured()||!Number.isSafeInteger(repositoryId)||!Number.isSafeInteger(installationId))throw new Error("GitHub setup is incomplete.");
  const {user,project}=await owner(slug);const jar=await cookies();const flow=unseal(jar.get(FLOW_COOKIE)?.value);
  if(!flow?.token||flow.user!==user.id||flow.project!==project.id)throw new Error("GitHub authorization expired. Connect again.");
  const repo=(await repositories(flow.token)).find(r=>r.id===repositoryId&&r.installation===installationId);
  if(!repo)throw new Error("Select a repository you manage and that this GitHub App can access.");
  const {data,error}=await admin().rpc("connect_project_github",{p_project_id:project.id,p_owner_id:user.id,p_installation_id:installationId,p_repository_id:repositoryId,p_full_name:repo.full_name,p_default_branch:repo.default_branch,p_private:repo.private});
  if(error)throw new Error("The repository connection couldn’t be saved. Check the GitHub database setup.");
  jar.delete(FLOW_COOKIE);
  try {await syncRepository({project_id:project.id,connection_id:data,installation_id:installationId,repository_id:repositoryId,full_name:repo.full_name,default_branch:repo.default_branch,sync_status:"pending",synced_at:null});}catch{/* Connection remains available for retry. */}
  revalidatePath(`/projects/${slug}`);return {ok:true as const};
 }catch(cause){return {ok:false as const,error:cause instanceof Error?cause.message:"GitHub connection failed."};}
}
export async function disconnectGitHub(slug:string) {
 try {const {project,db}=await owner(slug);const {error}=await db.rpc("disconnect_project_github",{p_project_id:project.id});if(error)throw new Error("The connection couldn’t be removed.");revalidatePath(`/projects/${slug}`);return {ok:true as const};}
 catch(cause){return {ok:false as const,error:cause instanceof Error?cause.message:"Disconnect failed."};}
}
export async function refreshGitHub(slug:string) {
 try {const {project}=await owner(slug);const {data,error}=await admin().from("project_github_connections").select("*").eq("project_id",project.id).single();if(error)throw new Error("Connect a repository first.");
 if(data.synced_at&&Date.now()-Date.parse(data.synced_at)<60000)throw new Error("Activity was just refreshed. Try again in a minute.");
 await syncRepository(data as Connection);revalidatePath(`/projects/${slug}`);return {ok:true as const};
 }catch(cause){const error=reportGitHubError(cause,"refresh");return {ok:false as const,error:cause instanceof GitHubError?error.message:"Activity couldn’t be refreshed yet. Wait a minute and try again."};}
}
// This action never returns commit details to public viewers, including on public repositories.
export async function memberCommits(slug:string) {
 try {const db=await createClient();const {data:{user}}=await db.auth.getUser();const project=await getProjectBySlug(slug);if(!user||!project)throw new Error();
 const {data:members}=await db.from("project_members").select("profile_id").eq("project_id",project.id).eq("profile_id",user.id);
 if(project.owner_id!==user.id&&!members?.length)throw new Error();
 const {data:c,error}=await admin().from("project_github_connections").select("*").eq("project_id",project.id).single();if(error||!c)throw new GitHubError("connection-storage","The repository connection couldn’t be loaded. Check the Supabase server key and GitHub migration.","load-connection");
 const token=await installationToken(c.installation_id,c.repository_id);
 const {data:repo}=await github<{full_name:string;default_branch:string}>(`/repositories/${c.repository_id}`,token);
 const path=repo.full_name.split("/").map(encodeURIComponent).join("/");
 const {data}=await github<{sha:string;commit:{message:string;author:{date:string}|null}}[]>(`/repos/${path}/commits?sha=${encodeURIComponent(repo.default_branch)}&per_page=10`,token);
 return {ok:true as const,commits:data.map(c=>({sha:c.sha,title:c.commit.message.split("\n")[0].slice(0,300),date:c.commit.author?.date??null}))};
 }catch(cause){const error=reportGitHubError(cause,"member-commits");return {ok:false as const,error:cause instanceof GitHubError?error.message:"Commit details are unavailable. Check your project access or try again later."};}
}
