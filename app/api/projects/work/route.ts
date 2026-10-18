import {createClient} from "@/lib/supabase/server";
import {admin,github,installationToken} from "@/lib/github/app";
import {repositoryMember} from "@/lib/anu/repository";
import {PROJECT_ID} from "@/lib/project-references/contract";
export const dynamic="force-dynamic";
const json=(body:object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
type Issue={number:number;title:string;body:string|null;updated_at:string;pull_request?:unknown;labels:Array<{name:string}>;assignees:Array<{login:string}>;comments:number};
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("project")||"";if(!PROJECT_ID.test(id))return json({error:"Invalid project."},400);
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 const {data:project,error}=await db.from("projects").select("id,visibility,publication_status,archived_at").eq("id",id).maybeSingle();
 if(error||!project)return json({state:"unavailable",issues:[]});
 if(project.archived_at)return json({state:"archived",issues:[]});
 const member=!!user&&await repositoryMember(db,id,user.id);
 if(!member&&(project.visibility!=="public"||project.publication_status!=="published"))return json({state:"unavailable",issues:[]});
 try{
  const {data:c,error:connectionError}=await admin().from("project_github_connections").select("connection_id,installation_id,repository_id,repo_private").eq("project_id",id).maybeSingle();
  if(connectionError)return json({state:"failed",issues:[]});
  if(!c)return json({state:"not-connected",issues:[]});
  if(!member&&c.repo_private)return json({state:"restricted",issues:[]});
  const signal=AbortSignal.timeout(8000);
  const contentsToken=await installationToken(c.installation_id,c.repository_id,signal);
  const {data:repo}=await github<{full_name:string;private:boolean}>(`/repositories/${c.repository_id}`,contentsToken,{signal});
  if(!member&&repo.private)return json({state:"restricted",issues:[]});
  const token=await installationToken(c.installation_id,c.repository_id,signal,true);
  const path=repo.full_name.split("/").map(encodeURIComponent).join("/");
  const {data}=await github<Issue[]>(`/repos/${path}/issues?state=open&sort=updated&direction=desc&per_page=50`,token,{signal});
  if(!Array.isArray(data))throw new Error("Invalid issue response");
  const issues=data.filter(item=>!item.pull_request&&Number.isSafeInteger(item.number)).map(item=>{
   const labels=(item.labels||[]).map(label=>label.name).filter((name):name is string=>typeof name==="string");
   const first=labels.some(label=>/^good[ -]first[ -]issue$/i.test(label));const help=labels.some(label=>/^help[ -]wanted$/i.test(label));const unassigned=!item.assignees?.length;
   return {number:item.number,title:item.title.slice(0,180),updatedAt:item.updated_at,labels:labels.slice(0,6),assigned:!unassigned,reason:first?"Labeled good first issue":help?"Labeled help wanted":unassigned?"No assignee listed":"Already has an assignee",score:(first?8:0)+(help?4:0)+(unassigned?2:0),url:`https://github.com/${path}/issues/${item.number}`};
  }).sort((a,b)=>b.score-a.score||b.updatedAt.localeCompare(a.updatedAt)).slice(0,12);
  // Recheck visibility/team membership and repository identity after network reads.
  const latest=await db.from("projects").select("visibility,publication_status,archived_at").eq("id",id).maybeSingle();
  const stillMember=!!user&&await repositoryMember(db,id,user.id);
  const latestConnection=await admin().from("project_github_connections").select("connection_id").eq("project_id",id).maybeSingle();
  if(latest.error||!latest.data||latest.data.archived_at||latestConnection.error||latestConnection.data?.connection_id!==c.connection_id||(!stillMember&&(repo.private||latest.data.visibility!=="public"||latest.data.publication_status!=="published")))return json({state:"unavailable",issues:[]});
  return json({state:"ready",issues,fetchedAt:new Date().toISOString(),coverage:"Up to 50 recently updated open issue-list records considered; pull requests excluded. Ranking uses labels and assignee status, not verified difficulty or availability."});
 }catch(error){console.warn("[project-work] retrieval failed",{kind:error instanceof Error?error.name:"UnknownError"});return json({state:"failed",issues:[]});}
}
