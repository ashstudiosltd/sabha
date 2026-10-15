"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects/server";
import { PROJECT_UUID, validVersion } from "@/lib/projects/validation";
import type { ProjectEvent } from "@/lib/projects/types";
export async function projectManagement(slug:string,action:"archive"|"restore"|"delete"|"transfer"|"add-member"|"remove-member",input:{version:number;confirmation?:string;profileId?:string;username?:string;role?:string}) {
 try {
  const db=await createClient();const {data:{user}}=await db.auth.getUser();const project=await getProjectBySlug(slug);
  if(!user||!project||project.owner_id!==user.id)return {ok:false as const,error:"Only the project owner can manage this action."};
  if(!validVersion(input.version))return {ok:false as const,error:"Reload the project to get its current version."};
  let error;
  if(action==="archive"||action==="restore")({error}=await db.rpc("set_project_archived",{p_project_id:project.id,p_expected_version:input.version,p_archived:action==="archive"}));
  else if(action==="delete")({error}=await db.rpc("delete_project",{p_project_id:project.id,p_expected_version:input.version,p_confirmation:input.confirmation??""}));
  else if(action==="transfer"&&PROJECT_UUID.test(input.profileId??""))({error}=await db.rpc("transfer_project_ownership",{p_project_id:project.id,p_expected_version:input.version,p_new_owner:input.profileId,p_confirmation:input.confirmation??""}));
  else if(action==="remove-member"&&PROJECT_UUID.test(input.profileId??""))({error}=await db.rpc("remove_project_member",{p_project_id:project.id,p_profile_id:input.profileId}));
  else if(action==="add-member"&&["maintainer","contributor"].includes(input.role??"")&&typeof input.username==="string"){
   const {data:profile,error:profileError}=await db.from("profiles").select("id").eq("username",input.username.trim().replace(/^@/,"")).maybeSingle();
   if(profileError||!profile)return {ok:false as const,error:"No profile found with that exact username."};
   ({error}=await db.rpc("set_project_member",{p_project_id:project.id,p_profile_id:profile.id,p_role:input.role}));
  }else return {ok:false as const,error:"Check the action details."};
  if(error)return {ok:false as const,error:error.code==="40001"?"The project changed. Reload before trying again.":"This action couldn’t be completed. Check the confirmation, project status, and permissions."};
  revalidatePath("/projects");revalidatePath(`/projects/${slug}`);revalidatePath("/projects/activity");return {ok:true as const};
 }catch{return {ok:false as const,error:"The action couldn’t be confirmed. Refresh to check its status."};}
}
export async function projectEventPage(slug:string|null,before?:{date:string;id:string},kind="all") {
 try {
  const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return {ok:false as const,error:"Sign in to view your project activity."};
  let query=db.from("project_audit_events").select("id,project_id,actor_id,event_type,changed_fields,created_at").order("created_at",{ascending:false}).order("id",{ascending:false}).limit(21);
  if(!["all","project","people"].includes(kind))return {ok:false as const,error:"Choose an activity filter."};
  if(kind==="people")query=query.in("event_type",["member_added","member_removed","member_role_changed","member_left","ownership_transferred"]);
  if(kind==="project")query=query.in("event_type",["created","updated","published","unpublished","archived","restored","legacy_owner_assigned"]);
  if(slug){const p=await getProjectBySlug(slug);if(!p)return {ok:false as const,error:"Project unavailable."};query=query.eq("project_id",p.id);}
  if(before){if(!PROJECT_UUID.test(before.id)||!Number.isFinite(Date.parse(before.date)))return {ok:false as const,error:"Reload the activity list."};const date=new Date(before.date).toISOString();query=query.or(`created_at.lt.${date},and(created_at.eq.${date},id.lt.${before.id})`);}
  const {data,error}=await query;if(error)return {ok:false as const,error:"Activity couldn’t load. Please try again."};
  const rows=(data??[]) as ProjectEvent[];
  const ids=[...new Set(rows.map(r=>r.project_id))];
  const {data:projects}=ids.length?await db.from("projects").select("id,slug,name").in("id",ids):{data:[]};
  const actorIds=[...new Set(rows.map(r=>r.actor_id).filter((id):id is string=>!!id))];
  const {data:actors}=actorIds.length?await db.from("profiles").select("id,name,username,avatar_url").in("id",actorIds):{data:[]};
  return {ok:true as const,events:rows.slice(0,20),hasMore:rows.length>20,projects:projects??[],actors:actors??[]};
 }catch{return {ok:false as const,error:"Activity couldn’t load. Please try again."};}
}
