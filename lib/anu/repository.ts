import "server-only";
import { admin, github, installationToken } from "@/lib/github/app";
import type { createClient } from "@/lib/supabase/server";
import type { AnuSource } from "./context";
type DB = Awaited<ReturnType<typeof createClient>>;
type Entry = { path: string; type: string; sha: string; size?: number };
// An allowlist keeps credentials, lock files, generated output and binaries out of model context.
function readable(path: string) {
 if (path.length > 240 || /(^|\/)(?:node_modules|vendor|dist|build|coverage|\.git|\.next|\.venv)(\/|$)/i.test(path)) return false;
 if (/(?:^|\/)(?:\.env[^/]*|[^/]*(?:secret|credential|password|token|private.?key)[^/]*|id_rsa|id_ed25519|\.npmrc|\.pypirc)$/i.test(path)) return false;
 return /(?:\.(?:tsx?|jsx?|py|rs|go|java|kt|swift|rb|php|vue|svelte|css|scss|sql|md|mdx)|(?:^|\/)(?:package\.json|pyproject\.toml|Cargo\.toml|go\.mod|requirements\.txt|Dockerfile|tsconfig\.json))$/i.test(path);
}
function redact(text: string) {
 return text.replace(/-----BEGIN [^-\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\n]*PRIVATE KEY-----/g,"[PRIVATE KEY REMOVED]")
 .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g,"[CREDENTIAL REMOVED]")
 .replace(/^.*(?:api[_-]?key|secret|password|access[_-]?token|authorization)\s*[:=].*$/gim,"[SENSITIVE LINE REMOVED]");
}
export async function repositoryMember(db: DB, projectId: string, userId: string) {
 const {data:project,error}=await db.from("projects").select("id,owner_id").eq("id",projectId).maybeSingle();
 if(error||!project)return false;
 if(project.owner_id===userId)return true;
 const membership=await db.from("project_members").select("profile_id").eq("project_id",projectId).eq("profile_id",userId).maybeSingle();
 return !membership.error&&!!membership.data;
}
export async function repositoryContext(db: DB,userId:string,projectId:string,message:string):Promise<{source?:AnuSource;status:string}> {
 if(!await repositoryMember(db,projectId,userId))return {status:"Repository code is limited to project owners and team members."};
 try {
  const service=admin();
  const {data:c,error}=await service.from("project_github_connections").select("connection_id,installation_id,repository_id").eq("project_id",projectId).maybeSingle();
  if(error)return {status:"Repository connection could not be read."};
  if(!c)return {status:"No repository is connected to this project."};
  const signal=AbortSignal.timeout(8_000);
  const token=await installationToken(c.installation_id,c.repository_id,signal);
  const {data:repo}=await github<{full_name:string;default_branch:string}>(`/repositories/${c.repository_id}`,token,{signal});
  if(!repo.default_branch)return {status:"The repository has no default branch."};
  const repoPath=repo.full_name.split("/").map(encodeURIComponent).join("/");
  const {data:commit}=await github<{sha:string;commit:{tree:{sha:string}}}>(`/repos/${repoPath}/commits/${encodeURIComponent(repo.default_branch)}`,token,{signal});
  if(!/^[a-f0-9]{40}$/i.test(commit.sha)||!/^[a-f0-9]{40}$/i.test(commit.commit.tree.sha))throw new Error("Invalid GitHub snapshot");
  const {data:tree}=await github<{tree:Entry[];truncated:boolean}>(`/repos/${repoPath}/git/trees/${commit.commit.tree.sha}?recursive=1`,token,{signal});
  const entries=tree.tree.filter(e=>e.type==="blob"&&readable(e.path)&&typeof e.size==="number"&&e.size<=100_000);
  const terms=[...new Set(message.toLowerCase().match(/[a-z0-9_-]{3,}/g)||[])].filter(t=>!["the","this","project","help","understand","summary","give","what"].includes(t)).slice(0,15);
  const priority=(e:Entry)=>{
   const name=e.path.toLowerCase();
   return (/^readme\.md$/i.test(name)?30:0)+(/(?:^|\/)(?:package\.json|pyproject\.toml|Cargo\.toml|go\.mod)$/i.test(name)?25:0)+(/(?:^|\/)(?:page|layout|main|app|index|server)\.(?:tsx?|jsx?|py|go|rs)$/.test(name)?8:0)+terms.reduce((n,t)=>n+(name.includes(t)?15:0),0);
  };
  const chosen=[...entries].sort((a,b)=>priority(b)-priority(a)||a.path.localeCompare(b.path)).slice(0,5);
  const files=await Promise.all(chosen.map(async entry=>{
   try {
    const {data:blob}=await github<{encoding:string;content:string;size:number}>(`/repos/${repoPath}/git/blobs/${entry.sha}`,token,{signal});
    if(blob.encoding!=="base64"||blob.size>100_000)return null;
    const bytes=Buffer.from(blob.content,"base64");if(bytes.includes(0))return null;
    const text=redact(bytes.toString("utf8"));const excerpt=text.slice(0,2000);
    return {path:entry.path,url:`https://github.com/${repoPath}/blob/${commit.sha}/${entry.path.split("/").map(encodeURIComponent).join("/")}`,content:excerpt,truncated:text.length>excerpt.length};
   }catch{return null;}
  }));
  // Fence disconnect/replacement and permissions changing while GitHub requests run.
  if(!await repositoryMember(db,projectId,userId))return {status:"Repository access changed during this request."};
  const latest=await service.from("project_github_connections").select("connection_id").eq("project_id",projectId).maybeSingle();
  if(latest.error||latest.data?.connection_id!==c.connection_id)return {status:"The connected repository changed during this request."};
  const inspected=files.filter(f=>!!f);
  const payload={repository:repo.full_name,branch:repo.default_branch,commit:commit.sha,coverage:{treeTruncated:tree.truncated,eligibleFiles:entries.length,inspectedFiles:inspected.length,excluded:"Sensitive paths, binaries, generated output, files over 100 KB. Credential detection is best effort, not a guarantee.",limits:"Up to five file excerpts of 2,000 characters; this is not a complete audit. Unread code and runtime behaviour remain unknown."},map:entries.slice(0,40).map(e=>e.path.slice(0,120)),files:inspected};
  while(JSON.stringify(payload).length>23000 && payload.files.length) payload.files.pop();
  payload.coverage.inspectedFiles=payload.files.length;
  return {status:"Retrieved a commit-pinned repository map and relevant file excerpts.",source:{id:projectId,kind:"repository",title:`${repo.full_name} · inspected code`,url:`https://github.com/${repoPath}/tree/${commit.sha}`,text:JSON.stringify(payload)}};
 }catch(error){console.warn("[anu-repository] retrieval failed",{kind:error instanceof Error?error.name:"UnknownError"});return {status:"Repository code could not be retrieved. Do not infer its contents."};}
}
