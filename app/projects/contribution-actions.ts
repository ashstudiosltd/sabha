"use server";
import {createClient} from "@/lib/supabase/server";
import {getProjectBySlug} from "@/lib/projects/server";
import {revalidatePath} from "next/cache";
export async function saveContributionGuide(slug:string,version:number|null,input:{overview:string;setup:string;first_steps:string}){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return {ok:false,error:"Sign in to continue."};
 const project=await getProjectBySlug(slug);if(!project||project.archived_at)return {ok:false,error:"This project cannot be edited."};
 const {data:allowed,error:permissionError}=await db.rpc("can_manage_project",{p_project_id:project.id});
 if(permissionError||!allowed)return {ok:false,error:"Only the owner and maintainers can edit contribution guidance."};
 if(!input||typeof input.overview!=="string"||typeof input.setup!=="string"||typeof input.first_steps!=="string"||input.overview.length>2000||input.setup.length>4000||input.first_steps.length>3000)return {ok:false,error:"Shorten the contribution guidance."};
 const fields={overview:input.overview.trim(),setup:input.setup.trim(),first_steps:input.first_steps.trim(),updated_at:new Date().toISOString()};
 if(version!==null&&(!Number.isSafeInteger(version)||version<1))return {ok:false,error:"Reload this project before saving."};
 const result=version===null?await db.from("project_contribution_guides").insert({project_id:project.id,...fields}).select("version").single():await db.from("project_contribution_guides").update({...fields,version:version+1}).eq("project_id",project.id).eq("version",version).select("version").maybeSingle();
 if(result.error||!result.data)return {ok:false,error:result.error?.code==="42P01"||result.error?.code==="PGRST205"?"Contribution storage needs its setup migration.":"The guidance changed or could not be saved. Reload before trying again."};
 revalidatePath(`/projects/${project.slug}`);return {ok:true,version:result.data.version as number};
}
