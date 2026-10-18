import {createClient} from "@/lib/supabase/server";
import {admin} from "@/lib/github/app";
import {syncHealth} from "@/lib/github/health";
import {repositoryMember} from "@/lib/anu/repository";
import {PROJECT_ID} from "@/lib/project-references/contract";
export const dynamic="force-dynamic";
const json=(body:object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("project")||"";if(!PROJECT_ID.test(id))return json({error:"Invalid project."},400);
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user||!await repositoryMember(db,id,user.id))return json({error:"Project status is unavailable."},403);
 try{const {data,error}=await admin().from("project_github_connections").select("*").eq("project_id",id).maybeSingle();if(error)return json({error:"Sync status couldn’t load."},503);if(!data)return json({connected:false});
 if(!await repositoryMember(db,id,user.id))return json({error:"Project status is unavailable."},403);
 return json({connected:true,health:syncHealth(data)});
 }catch{return json({error:"Sync status couldn’t load."},503);}
}
