"use client";
import {useEffect,useId,useRef,useState} from "react";
import {Search,ChevronDown,FolderCode,Lock,X,Check} from "lucide-react";
import type {ProjectPreview} from "@/lib/project-references/contract";
import styles from "./project-picker.module.css";
export default function ProjectPicker({value,onChange}:{value:ProjectPreview|null;onChange:(project:ProjectPreview|null)=>void}){
 const [query,setQuery]=useState("");const [projects,setProjects]=useState<ProjectPreview[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState(false);const [open,setOpen]=useState(false);const [active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null);const input=useRef<HTMLInputElement>(null);const listId=useId();
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);},[open]);
 useEffect(()=>{if(!open)return;const abort=new AbortController();setLoading(true);setError(false);setActive(0);const timer=setTimeout(()=>{void fetch(`/api/project-references?mode=pick&q=${encodeURIComponent(query)}`,{cache:"no-store",signal:abort.signal}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();if(!abort.signal.aborted)setProjects(data.projects||[]);}).catch(()=>{if(!abort.signal.aborted)setError(true);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});},180);return()=>{clearTimeout(timer);abort.abort();};},[query,open]);
 useEffect(()=>{if(open)root.current?.querySelector(`[data-option="${active}"]`)?.scrollIntoView({block:"nearest",inline:"nearest"});},[active,open]);
 const choose=(project:ProjectPreview)=>{onChange(project);setOpen(false);setQuery("");};
 return <div ref={root} className={styles.picker} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
 {value?<div className={styles.selected}><span className={styles.projectIcon}><FolderCode size={18}/></span><div className={styles.identity}><strong>{value.name}</strong><small>{value.stage}{value.visibility==="private"?" · Private":""}</small></div><Check size={15} className={styles.check}/><button type="button" className={styles.iconButton} aria-label="Remove attached project" onClick={()=>onChange(null)}><X size={16}/></button></div>:<>
 <div className={styles.search}><Search size={16}/><input ref={input} role="combobox" aria-label="Search projects to attach" aria-expanded={open} aria-controls={open?listId:undefined} aria-autocomplete="list" aria-activedescendant={open&&!loading&&!error&&projects[active]?`${listId}-${active}`:undefined} placeholder="Choose a project…" value={query} onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);}} onKeyDown={event=>{
 if(event.key==="Escape"){event.stopPropagation();setOpen(false);}
 if(event.key==="Tab")setOpen(false);
 if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();if(!open)setOpen(true);else setActive(index=>Math.max(0,Math.min(projects.length-1,index+(event.key==="ArrowDown"?1:-1))));}
 if(event.key==="Enter"){event.preventDefault();if(open&&!loading&&!error&&projects[active])choose(projects[active]);else setOpen(true);}
 }}/><button type="button" className={styles.iconButton} aria-label={open?"Close project options":"Show project options"} onClick={()=>{if(open)setOpen(false);else{setOpen(true);input.current?.focus();}}}><ChevronDown size={16}/></button></div>
 {open&&<div className={styles.menu} id={listId} role="listbox" aria-label="Available projects">
 {loading?<p role="status" className={styles.status}>Finding projects…</p>:error?<p role="status" className={styles.status}>Projects couldn’t load. Change your search to try again.</p>:!projects.length?<p className={styles.status}>No matching published projects.</p>:projects.map((project,index)=><button type="button" role="option" id={`${listId}-${index}`} data-option={index} aria-selected={index===active} className={styles.option} key={project.id} onPointerDown={event=>event.preventDefault()} onPointerMove={()=>setActive(index)} onClick={()=>choose(project)}><FolderCode size={17}/><span className={styles.identity}><strong>{project.name}</strong><small>{project.tagline||project.stage}</small></span>{project.visibility==="private"&&<Lock size={13} aria-label="Private project"/>}</button>)}
 </div>}</>}
 </div>;
}
