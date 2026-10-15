import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { catalogFilters, readCatalog } from "@/lib/projects/catalog";
import ProjectsCatalog from "./projects-catalog";
export default async function CatalogPage({raw,mine}:{raw:Record<string,string|undefined>;mine:boolean}){
 const filters=catalogFilters(raw,mine?"mine":"public");const db=await createClient();
 if(mine){const {data:{user}}=await db.auth.getUser();if(!user)redirect("/auth?next=%2Fprojects%2Fworkspace");}
 let error:string|null=null;let initial:Awaited<ReturnType<typeof readCatalog>>={projects:[],profiles:[],next:null};let counts:Record<string,number>|null=null;
 try{const [result,summary]=await Promise.all([readCatalog(filters),mine?db.rpc("project_workspace_counts"):Promise.resolve({data:null,error:null})]);initial=result;if(!summary.error)counts=summary.data as Record<string,number>|null;}catch(cause){error=cause instanceof Error?cause.message:"Projects couldn’t load.";}
 return <ProjectsCatalog key={JSON.stringify([filters,initial.projects.map(p=>[p.id,p.version]),error])} filters={filters} initial={initial} error={error} counts={counts}/>;
}
