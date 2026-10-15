import "server-only";
import { developmentContext } from "./development";
import { admin, github, installationToken } from "@/lib/github/app";
import type { createClient } from "@/lib/supabase/server";
import { questionTerms, seedScore, readAliases, codeConnections, excerpt, type CodeFile, type CodeEdge } from "./code-map";
import type { AnuSource } from "./context";
type DB = Awaited<ReturnType<typeof createClient>>;
type Entry = { path: string; type: string; sha: string; size?: number };
// An allowlist keeps credentials, lock files, generated output and binaries out of model context.
function readable(path: string) {
 if (path.length > 240 || /(^|\/)(?:node_modules|vendor|dist|build|coverage|\.git|\.next|\.venv)(\/|$)/i.test(path)) return false;
 if (/(?:^|\/)(?:\.env[^/]*|[^/]*(?:secret|credential|password|token|private.?key)[^/]*|id_rsa|id_ed25519|\.npmrc|\.pypirc)$/i.test(path)) return false;
 return /(?:\.(?:tsx?|jsx?|py|rs|go|java|kt|swift|rb|php|vue|svelte|css|scss|sql|md|mdx)|(?:^|\/)(?:package\.json|pyproject\.toml|Cargo\.toml|go\.mod|requirements\.txt|Dockerfile|tsconfig\.json))$/i.test(path);
}
export function redact(text: string) {
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
  const developmentTask=developmentContext({installationId:c.installation_id,repositoryId:c.repository_id,repoPath,sha:commit.sha,token,message,signal}).catch(()=>({commits:[],issues:[],pullRequests:[],references:[],unavailable:["Development discussion retrieval failed; do not infer missing activity."],coverage:"Development context unavailable for this request."}));
  const {data:tree}=await github<{tree:Entry[];truncated:boolean}>(`/repos/${repoPath}/git/trees/${commit.commit.tree.sha}?recursive=1`,token,{signal});
  const entries=tree.tree.filter(e=>e.type==="blob"&&readable(e.path)&&typeof e.size==="number"&&e.size<=100_000);
  const terms=questionTerms(message);
  const paths=new Set(entries.map(entry=>entry.path));
  const byPath=new Map(entries.map(entry=>[entry.path,entry]));
  const loaded=new Map<string,CodeFile>();
  const failed:string[]=[];
  const read=async(entry:Entry)=>{
   try {
    const {data:blob}=await github<{encoding:string;content:string;size:number}>(`/repos/${repoPath}/git/blobs/${entry.sha}`,token,{signal});
    if(blob.encoding!=="base64"||blob.size>100_000)throw new Error("Unsupported blob");
    const bytes=Buffer.from(blob.content,"base64");if(bytes.includes(0))throw new Error("Binary blob");
    loaded.set(entry.path,{path:entry.path,text:redact(bytes.toString("utf8"))});
   }catch{failed.push(entry.path);}
  };
  const ranked=[...entries].sort((a,b)=>seedScore(b.path,terms)-seedScore(a.path,terms)||a.path.localeCompare(b.path));
  const initial=ranked.slice(0,4);
  const config=byPath.get("tsconfig.json");
  if(config&&!initial.some(e=>e.path===config.path))initial.push(config);
  await Promise.all(initial.map(read));
  const aliases=readAliases(loaded.get("tsconfig.json")?.text||"");
  const edges:CodeEdge[]=[];
  const unresolved:Array<{from:string;specifier:string}>=[];
  const scanned=new Set<string>();
  for(let depth=0;depth<2;depth++){
   const candidates=new Set<string>();
   for(const file of loaded.values()){
    if(scanned.has(file.path))continue;scanned.add(file.path);
    const links=codeConnections(file,paths,aliases);edges.push(...links.edges);
    unresolved.push(...links.unresolved.map(specifier=>({from:file.path,specifier})));
    for(const edge of links.edges)if(!loaded.has(edge.to)&&!failed.includes(edge.to))candidates.add(edge.to);
   }
   const next=[...candidates].sort((a,b)=>seedScore(b,terms)-seedScore(a,terms)||a.localeCompare(b)).slice(0,Math.max(0,10-loaded.size-failed.length));
   if(!next.length)break;
   await Promise.all(next.map(path=>read(byPath.get(path)!)));
  }
  const files=[...loaded.values()].map(file=>({path:file.path,url:`https://github.com/${repoPath}/blob/${commit.sha}/${file.path.split("/").map(encodeURIComponent).join("/")}`,...excerpt(file,terms)}));
  const development=await developmentTask;
  // Fence disconnect/replacement and permissions changing while GitHub requests run.
  if(!await repositoryMember(db,projectId,userId))return {status:"Repository access changed during this request."};
  const latest=await service.from("project_github_connections").select("connection_id").eq("project_id",projectId).maybeSingle();
  if(latest.error||latest.data?.connection_id!==c.connection_id)return {status:"The connected repository changed during this request."};
  const inspected=files;
  const payload={repository:repo.full_name,branch:repo.default_branch,commit:commit.sha,coverage:{treeTruncated:tree.truncated,eligibleFiles:entries.length,inspectedFiles:inspected.length,excluded:"Sensitive paths, binaries, generated output, files over 100 KB. Credential detection is best effort, not a guarantee.",limits:"Up to ten files, two import/API traversal rounds, selected line-numbered excerpts of 1,600 characters. JS/TS local imports and static fetch routes only. Dynamic imports/paths, external services, JSONC aliases and other languages may remain unresolved. No code execution."},map:ranked.slice(0,40).map(e=>e.path.slice(0,120)),connections:edges.slice(0,50),unresolved:unresolved.slice(0,20),failedFiles:failed,development:{...development,references:undefined},files:inspected};
  while(JSON.stringify(payload).length>23000 && payload.connections.length>10) payload.connections.pop();
  while(JSON.stringify(payload).length>23000 && payload.unresolved.length) payload.unresolved.pop();
  while(JSON.stringify(payload).length>23000 && payload.map.length>10) payload.map.pop();
  while(JSON.stringify(payload).length>23000 && payload.files.length) payload.files.pop();
  while(JSON.stringify(payload).length>23000 && payload.development.commits.length) payload.development.commits.pop();
  while(JSON.stringify(payload).length>23000 && payload.development.pullRequests.length) payload.development.pullRequests.pop();
  while(JSON.stringify(payload).length>23000 && payload.development.issues.length) payload.development.issues.pop();
  payload.coverage.inspectedFiles=payload.files.length;
  return {status:"Retrieved a commit-pinned repository map and relevant file excerpts.",source:{id:projectId,kind:"repository",title:`${repo.full_name} · inspected code`,url:`https://github.com/${repoPath}/tree/${commit.sha}`,text:JSON.stringify(payload),references:/commit|recent|issue|pull.?request|discussion|blocker|work.?on/i.test(message) ? development.references.filter(ref=>JSON.stringify(payload.development).includes(ref.url)).concat(payload.files.map(file=>({title:file.path,url:file.url}))) : payload.files.map(file=>({title:file.path,url:file.url})).concat(development.references.filter(ref=>JSON.stringify(payload.development).includes(ref.url)))}};
 }catch(error){console.warn("[anu-repository] retrieval failed",{kind:error instanceof Error?error.name:"UnknownError"});return {status:"Repository code could not be retrieved. Do not infer its contents."};}
}
