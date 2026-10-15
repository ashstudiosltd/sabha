"use client";
import { createContext,useContext,useEffect,useState,type ReactNode } from "react";
import Link from "next/link";
import { FolderCode,ArrowUpRight,Lock } from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import { projectReferenceKey,type ProjectPreview } from "@/lib/project-references/contract";
import styles from "./project-attachment.module.css";
type State={projects:ProjectPreview[];loading:boolean;failed:boolean};
const Context=createContext<State>({projects:[],loading:true,failed:false});
export function ProjectReferences({references,children}:{references:Array<string|null|undefined>;children:ReactNode}){
 const key=[...new Set(references.map(projectReferenceKey).filter((value):value is string=>!!value))].sort().join(",");
 const [state,setState]=useState<State & {key:string}>({key:"",projects:[],loading:true,failed:false});
 const [generation,setGeneration]=useState(0);
 useEffect(()=>{const db=createClient();const {data:{subscription}}=db.auth.onAuthStateChange(()=>setGeneration(value=>value+1));return()=>subscription.unsubscribe();},[]);
 useEffect(()=>{
  const abort=new AbortController();setState({key:`${generation}:${key}`,projects:[],loading:true,failed:false});
  if(!key){setState({key:`${generation}:${key}`,projects:[],loading:false,failed:false});return;}
  // Fetch in bounded batches, avoiding a request for every card.
  const keys=key.split(",");const batches=[];for(let i=0;i<keys.length;i+=50)batches.push(keys.slice(i,i+50));
  void Promise.all(batches.map(async batch=>{const response=await fetch(`/api/project-references?keys=${encodeURIComponent(batch.join(","))}`,{cache:"no-store",signal:abort.signal});if(!response.ok)throw new Error();const data=await response.json();return Array.isArray(data.projects)?data.projects:[];})).then(projects=>{if(!abort.signal.aborted)setState({key:`${generation}:${key}`,projects:projects.flat(),loading:false,failed:false});}).catch(()=>{if(!abort.signal.aborted)setState({key:`${generation}:${key}`,projects:[],loading:false,failed:true});});
  return()=>abort.abort();
 },[key,generation]);
 const value=state.key===`${generation}:${key}`?state:{projects:[],loading:true,failed:false};
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export default function ProjectAttachment({reference}:{reference:string}){
 const {projects,loading,failed}=useContext(Context);const key=projectReferenceKey(reference);const project=projects.find(item=>item.id===key||item.slug===key);
 if(loading)return <div className={styles.placeholder} role="status">Loading project…</div>;
 if(!project)return <div className={styles.placeholder}><FolderCode size={17}/><span>{failed?"Project preview couldn’t load.":"This project isn’t available to your account."}</span></div>;
 return <Link href={`/projects/${project.slug}`} className={styles.card} aria-label={`Open project: ${project.name}`}>
  <div className={styles.heading}><span className={styles.icon}><FolderCode size={20}/></span><div><small>Project{project.archived?" · Archived":""}</small><strong>{project.name}</strong></div><ArrowUpRight size={17}/></div>
  {project.tagline&&<p>{project.tagline}</p>}
  <div className={styles.details}><span>{project.stage}</span>{project.visibility==="private"&&<span><Lock size={12}/>Private</span>}{project.technologies.slice(0,4).map(technology=><span key={technology}>{technology}</span>)}</div>
 </Link>;
}
