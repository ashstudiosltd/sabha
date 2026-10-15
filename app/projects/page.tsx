import { redirect } from "next/navigation";
import CatalogPage from "@/components/workspace/catalog-page";
export const dynamic="force-dynamic";
export default async function ProjectsPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const raw=await searchParams;if(raw.view==="mine"){const p=new URLSearchParams(Object.entries(raw).filter(([key,value])=>key!=="view"&&typeof value==="string") as [string,string][]);redirect(`/projects/workspace${p.size?`?${p}`:""}`);}return <CatalogPage raw={raw} mine={false}/>;}
