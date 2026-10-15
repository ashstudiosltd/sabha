import "server-only";
import { createClient } from "@/lib/supabase/server";
import { projectProfiles } from "./server";
import { PROJECT_STAGES, type Project } from "./types";
import { PROJECT_UUID } from "./validation";
export interface CatalogFilters {scope:"public"|"mine";q:string;stage:string;technology:string;status:string;relation:string;sort:string}
export interface CatalogCursor {id:string;score:number;at:string;name:string}
export function catalogFilters(raw:Record<string,string|undefined>,scope:"public"|"mine"):CatalogFilters {
 const query=typeof raw.q==="string"?raw.q.trim().slice(0,100):"";
 const technology=typeof raw.technology==="string"?raw.technology.trim().toLowerCase().slice(0,40):"";
 const choose=(value:string|undefined,allowed:readonly string[],fallback:string)=>allowed.includes(value??"")?value!:fallback;
 return {scope,q:query,stage:choose(raw.stage,PROJECT_STAGES,""),technology,status:scope==="mine"?choose(raw.status,["all","draft","published","archived"],"all"):"all",relation:scope==="mine"?choose(raw.relation,["all","owned","collaborating"],"all"):"all",sort:choose(raw.sort,["recent","newest","name","relevance"],query?"relevance":"recent")};
}
export async function readCatalog(filters:CatalogFilters,cursor?:CatalogCursor) {
 const db=await createClient();
 if(filters.scope==="mine"){const {data:{user}}=await db.auth.getUser();if(!user)throw new Error("Sign in to view your workspace.");}
 if(cursor&&(!PROJECT_UUID.test(cursor.id)||!Number.isSafeInteger(cursor.score)||!Number.isFinite(Date.parse(cursor.at))||typeof cursor.name!=="string"||cursor.name.length>80))throw new Error("Reload this collection before loading more.");
 const {data,error}=await db.rpc("search_project_catalog",{p_scope:filters.scope,p_query:filters.q,p_stage:filters.stage,p_technology:filters.technology,p_status:filters.status,p_relation:filters.relation,p_sort:filters.sort,p_cursor:cursor??null,p_limit:21});
 if(error)throw new Error(error.code==="PGRST202"?"The discovery database update hasn’t been applied yet. Run the Projects catalog migration.":"Projects couldn’t load. Please try again.");
 const rows=(data??[]) as {project:Project;relevance_score:number;sort_at:string;sort_name:string}[];const page=rows.slice(0,20);const last=page.at(-1);const projects=page.map(r=>r.project);
 return {projects,profiles:await projectProfiles(projects),next:rows.length>20&&last?{id:last.project.id,score:last.relevance_score,at:last.sort_at,name:last.sort_name}:null};
}
