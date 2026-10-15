"use client";
import {useEffect,useState} from "react";
import type {ProjectPreview} from "@/lib/project-references/contract";
export default function ProjectPicker({value,onChange}:{value:ProjectPreview|null;onChange:(project:ProjectPreview|null)=>void}){
 const [query,setQuery]=useState("");const [projects,setProjects]=useState<ProjectPreview[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError(false);const timer=setTimeout(()=>{void fetch(`/api/project-references?mode=pick&q=${encodeURIComponent(query)}`,{cache:"no-store",signal:abort.signal}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();if(!abort.signal.aborted)setProjects(data.projects||[]);}).catch(()=>{if(!abort.signal.aborted)setError(true);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});},180);return()=>{clearTimeout(timer);abort.abort();};},[query]);
 return <div style={{gridColumn:"1 / -1",minWidth:0}}>
 {value?<div className="sabha-surface" style={{padding:16,borderRadius:14}}><strong>{value.name}</strong><p className="sabha-muted" style={{fontSize:12,margin:"8px 0"}}>{value.tagline}</p><button type="button" className="sabha-button" onClick={()=>onChange(null)}>Change project</button></div>:<>
 <input className="sabha-field" style={{width:"100%"}} aria-label="Search projects to attach" placeholder="Find a published project…" value={query} onChange={event=>setQuery(event.target.value)}/>
 <div aria-label="Available projects" style={{display:"grid",gap:6,maxHeight:230,overflowY:"auto",marginTop:10}}>
 {loading?<p role="status" className="sabha-muted">Finding projects…</p>:error?<p role="alert">Projects couldn’t load. Try changing your search.</p>:!projects.length?<p className="sabha-muted">No published projects match this search.</p>:projects.map(project=><button type="button" className="sabha-button" key={project.id} onClick={()=>onChange(project)} style={{textAlign:"left",display:"grid",justifyContent:"stretch",whiteSpace:"normal",overflowWrap:"anywhere"}}><strong>{project.name}</strong><small className="sabha-muted">{project.visibility==="private"?"Private · preview follows each viewer’s access":project.tagline||project.stage}</small></button>)}
 </div></>}
 <p className="sabha-muted" style={{fontSize:12,lineHeight:1.6}}>The attachment follows each viewer’s project access. It does not grant membership.</p>
 </div>;
}
