import "server-only";
import { github, installationToken } from "@/lib/github/app";
import { questionTerms } from "./code-map";
// Keep this sanitizer independent of repository retrieval to avoid circular imports.
function clean(text:string,limit:number){return text.replace(/-----BEGIN [^-\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\n]*PRIVATE KEY-----/g,"[PRIVATE KEY REMOVED]").replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9_-]{20,})\b/g,"[CREDENTIAL REMOVED]").replace(/^.*(?:api[_-]?key|secret|password|access[_-]?token|authorization)\s*[:=].*$/gim,"[SENSITIVE LINE REMOVED]").slice(0,limit);}
type Issue={number:number;title:string;body:string|null;state:string;updated_at:string;closed_at:string|null;pull_request?:unknown;user:{login:string}|null;comments:number;labels:Array<{name:string}>};
type Pull=Issue&{draft:boolean;merged_at:string|null;head:{ref:string;sha:string};base:{ref:string;sha:string}};
type Comment={body:string;created_at:string;updated_at:string;user:{login:string}|null};
type Commit={sha:string;commit:{message:string;author:{name:string;date:string}|null;committer:{date:string}|null}};
export async function developmentContext(input:{installationId:number;repositoryId:number;repoPath:string;sha:string;token:string;message:string;signal:AbortSignal}){
 const {installationId,repositoryId,repoPath,sha,token,message,signal}=input;
 const unavailable:string[]=[];
 const references:Array<{title:string;url:string}>=[];
 const terms=questionTerms(message);
 const score=(item:Issue)=>terms.reduce((n,t)=>n+(`${item.title} ${item.body||""}`.toLowerCase().includes(t)?1:0),0);
 const commitTask=github<Commit[]>(`/repos/${repoPath}/commits?sha=${sha}&per_page=10`,token,{signal}).then(({data})=>{
  if(!Array.isArray(data))return [];
  return data.filter(c=>/^[a-f0-9]{40}$/i.test(c.sha)).map(c=>{const url=`https://github.com/${repoPath}/commit/${c.sha}`;references.push({title:`Commit ${c.sha.slice(0,7)}`,url});return {sha:c.sha,message:clean(c.commit.message,500),author:c.commit.author?.name||null,date:c.commit.committer?.date||c.commit.author?.date||null,url};});
 }).catch(()=>{unavailable.push("Recent commits could not be retrieved.");return [];});
 const discussionTask=(async()=>{
  let discussionToken:string;
  try{discussionToken=await installationToken(installationId,repositoryId,signal,true);}catch{unavailable.push("Issues and pull requests are unavailable. The GitHub App needs Issues and Pull requests read access, and the installation must approve those permissions.");return {issues:[],pullRequests:[]};}
  const [issuesResult,pullsResult]=await Promise.allSettled([
   github<Issue[]>(`/repos/${repoPath}/issues?state=all&sort=updated&direction=desc&per_page=20`,discussionToken,{signal}),
   github<Pull[]>(`/repos/${repoPath}/pulls?state=all&sort=updated&direction=desc&per_page=20`,discussionToken,{signal}),
  ]);
  const issues=issuesResult.status==="fulfilled"&&Array.isArray(issuesResult.value.data)?issuesResult.value.data.filter(i=>!i.pull_request):[];
  const pulls=pullsResult.status==="fulfilled"&&Array.isArray(pullsResult.value.data)?pullsResult.value.data:[];
  if(issuesResult.status==="rejected")unavailable.push("Issues could not be read; do not infer that none exist.");
  if(pullsResult.status==="rejected")unavailable.push("Pull requests could not be read; do not infer that none exist.");
  const rank=<T extends Issue>(items:T[])=>items.sort((a,b)=>score(b)-score(a)||b.updated_at.localeCompare(a.updated_at)).slice(0,3);
  const describe=async(item:Issue,isPull:boolean)=>{
   if(!Number.isSafeInteger(item.number)||item.number<=0)return null;
   const url=`https://github.com/${repoPath}/${isPull?"pull":"issues"}/${item.number}`;
   references.push({title:`${isPull?"PR":"Issue"} #${item.number}: ${clean(item.title,100)}`,url});
   let comments:Array<{author:string|null;body:string;createdAt:string;updatedAt:string}>=[];
   if(item.comments>0){try{const {data}=await github<Comment[]>(`/repos/${repoPath}/issues/${item.number}/comments?per_page=5`,discussionToken,{signal});if(Array.isArray(data))comments=data.map(c=>({author:c.user?.login||null,body:clean(c.body,400),createdAt:c.created_at,updatedAt:c.updated_at}));}catch{unavailable.push(`Comments for ${isPull?"PR":"issue"} #${item.number} could not be retrieved.`);}}
   const pull=item as Pull;
   return {number:item.number,title:clean(item.title,180),body:clean(item.body||"",700),state:item.state,author:item.user?.login||null,updatedAt:item.updated_at,closedAt:item.closed_at,labels:item.labels?.map(l=>clean(l.name,50)).slice(0,8)||[],url,comments,commentCoverage:`First ${comments.length} conversation comments; not a complete discussion. Inline reviews and review decisions were not retrieved.`,...(isPull?{draft:pull.draft,mergedAt:pull.merged_at,head:pull.head?.ref,base:pull.base?.ref}: {})};
  };
  const described=await Promise.all([...rank(issues).map(i=>describe(i,false)),...rank(pulls).map(p=>describe(p,true))]);
  return {issues:described.slice(0,Math.min(3,issues.length)).filter(Boolean),pullRequests:described.slice(Math.min(3,issues.length)).filter(Boolean)};
 })();
 const [commits,discussions]=await Promise.all([commitTask,discussionTask]);
 return {commits,...discussions,unavailable,coverage:"Up to 10 commits reachable from the inspected default-branch SHA; 20 recently updated issue-list records (GitHub includes PRs in this list) and 20 PRs considered, up to 3 of each selected by question relevance and recency. First 5 conversation comments each. Branch commits do not prove deployed behaviour; open status does not prove a blocker and closed does not prove resolved. Not an exhaustive history.",references};
}
