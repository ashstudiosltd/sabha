"use client";
import ProjectAttachment,{ProjectReferences} from "./project-attachment";
import {PROJECT_ID} from "@/lib/project-references/contract";
export function embeddedProject(paragraph:string){const match=paragraph.trim().match(/^\[\[project:([^\]]+)\]\]$/);return match&&PROJECT_ID.test(match[1])?`/projects/${match[1]}`:null;}
export default function BlogProjectContent({paragraphs,attachmentsOnly=false}:{paragraphs:string[];attachmentsOnly?:boolean}){
 return <ProjectReferences references={paragraphs.map(embeddedProject)}>{paragraphs.map((paragraph,index)=>{const reference=embeddedProject(paragraph);return reference?<ProjectAttachment key={index} reference={reference}/>:attachmentsOnly?null:<p key={index}>{paragraph}</p>;})}</ProjectReferences>;
}
