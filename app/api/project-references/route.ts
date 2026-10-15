import { createClient } from "@/lib/supabase/server";
import { PROJECT_ID, type ProjectPreview } from "@/lib/project-references/contract";
export const dynamic="force-dynamic";
const json=(body:object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
export async function GET(request:Request){
 const keys=[...new Set((new URL(request.url).searchParams.get("keys")||"").split(",").filter(Boolean))];
 if(keys.length>50||keys.some(key=>! /^[a-z0-9-]{2,100}$/i.test(key)))return json({error:"Invalid project references."},400);
 const db=await createClient();
 if(new URL(request.url).searchParams.get("mode")==="pick"){
  const {data:{user}}=await db.auth.getUser();if(!user)return json({error:"Sign in to attach a project."},401);
  const q=(new URL(request.url).searchParams.get("q")||"").trim().slice(0,100);
  let query=db.from("projects").select("id,slug,name,tagline,technologies,stage,visibility,archived_at").eq("publication_status","published").is("archived_at",null).order("updated_at",{ascending:false}).limit(20);
  if(q)query=query.ilike("name",`%${q.replace(/[\\%_]/g,"\\$&")}%`);
  const {data,error}=await query;
  return error?json({error:"Projects couldn’t load."},503):json({projects:(data||[]).map(row=>({...row,archived:false}))});
 }
 if(!keys.length)return json({projects:[]});
 const ids=keys.filter(key=>PROJECT_ID.test(key));const slugs=keys.filter(key=>!PROJECT_ID.test(key));
 const fields="id,slug,name,tagline,technologies,stage,visibility,archived_at,publication_status";
 const results=await Promise.all([ids.length?db.from("projects").select(fields).in("id",ids):Promise.resolve({data:[],error:null}),slugs.length?db.from("projects").select(fields).in("slug",slugs):Promise.resolve({data:[],error:null})]);
 if(results.some(result=>result.error))return json({error:"Project previews couldn’t load."},503);
 // Drafts have an editing workflow; attachments only expose published projects.
 const projects:ProjectPreview[]=results.flatMap(result=>result.data||[]).filter(row=>row.publication_status==="published").map(row=>({id:row.id,slug:row.slug,name:row.name,tagline:row.tagline,technologies:row.technologies||[],stage:row.stage,visibility:row.visibility,archived:!!row.archived_at}));
 return json({projects});
}
