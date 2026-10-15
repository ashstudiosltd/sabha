import {ImageResponse} from "next/og";
import {publicProject} from "@/lib/project-references/public";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const alt="Devvrats project preview";
export const size={width:1200,height:630};
export const contentType="image/png";
export default async function ProjectImage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const project=await publicProject(slug);
 return new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"100%",height:"100%",background:"#090909",color:"#f5f5f7",padding:64,fontFamily:"sans-serif"}}>
 <div style={{display:"flex",fontSize:24,color:"#bf94f5"}}>Devvrats / Projects</div>
 <div style={{display:"flex",flexDirection:"column",gap:22}}><div style={{display:"flex",fontSize:64,fontWeight:700,lineHeight:1.1}}>{project?project.name.slice(0,90):"Build together."}</div><div style={{display:"flex",fontSize:28,color:"#b2b2b8",lineHeight:1.5}}>{project?(project.tagline||"A project built with the Devvrats community.").slice(0,180):"Discover projects and the people building them on Devvrats."}</div></div>
 <div style={{display:"flex",gap:16,fontSize:20,color:"#b2b2b8"}}>{project?<><span>{project.stage}</span><span>·</span><span>{(project.technologies||[]).slice(0,4).join(" · ").slice(0,100)}</span></>:<span>sabha.devvrats.in/projects</span>}</div>
 </div>,{...size,headers:{"Cache-Control":"no-store"}});
}
