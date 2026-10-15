"use client";
import {useState} from "react";
import {Share2} from "lucide-react";
import ShareSheet from "@/components/ShareSheet";
export default function ProjectShare({id,name}:{id:string;name:string|null}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="dv-button" onClick={()=>setOpen(true)}><Share2 size={15}/>Share</button>{open&&<ShareSheet open onClose={()=>setOpen(false)} shareData={{title:name||"Devvrats project",text:name?`Explore ${name} on Devvrats.`:"Project access is limited to authorized accounts.",url:`https://sabha.devvrats.in/projects/${id}`}}/>}</>;
}
