import {createClient} from "@/lib/supabase/server";
import ProjectAttachment,{ProjectReferences} from "./project-attachment";
export default async function ProfileProjects({profileId,query=""}:{profileId:string;query?:string}){
 const db=await createClient();
 const membership=await db.from("project_members").select("project_id,role").eq("profile_id",profileId).limit(100);
 const ids=(membership.data||[]).map(row=>row.project_id);
 const [owned,joined]=await Promise.all([db.from("projects").select("id,name").eq("owner_id",profileId).eq("publication_status","published").order("updated_at",{ascending:false}).limit(50),ids.length?db.from("projects").select("id,name").in("id",ids).eq("publication_status","published").order("updated_at",{ascending:false}).limit(50):Promise.resolve({data:[],error:null})]);
 if(owned.error||joined.error||membership.error)return <p role="status" className="sabha-muted">Project contributions couldn’t load.</p>;
 const owners=new Set((owned.data||[]).map(row=>row.id));
 const projects=[...(owned.data||[]),...(joined.data||[]).filter(row=>!owners.has(row.id))].filter(row=>!query||row.name.toLowerCase().includes(query.toLowerCase()));
 const refs=projects.map(row=>`/projects/${row.id}`);
 return <section className="mt-5" aria-label="Project contributions"><ProjectReferences references={refs}>{projects.length?projects.map(project=><article key={project.id}><p className="sabha-muted" style={{fontSize:12,marginTop:20}}>{owners.has(project.id)?"Owner":(membership.data||[]).find(row=>row.project_id===project.id)?.role||"Contributor"}</p><ProjectAttachment reference={`/projects/${project.id}`}/></article>):<p className="sabha-muted">No matching project contributions are available to show.</p>}</ProjectReferences></section>;
}
