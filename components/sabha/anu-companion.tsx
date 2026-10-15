"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BlogsAnuCompanion } from "@/components/blogs/anu/anu-panel";
import { createClient } from "@/lib/supabase/client";
export default function SabhaAnuCompanion(){
 const path=usePathname();
 const [focus,setFocus]=useState<{path:string;kind:string;id:string}|null>(null);
 useEffect(()=>{
  let active=true;
  const project=path.match(/^\/projects\/([a-z0-9-]+)$/);
  const clan=path.match(/^\/feed\/clans\/([a-z0-9-]+)$/);
  const feed=path.match(/^\/feed\/([0-9a-f-]{36})$/i);
  if(feed){setFocus({path,kind:"feed",id:feed[1]});return;}
  const slug=project?.[1]||clan?.[1];
  if(slug && !["new","workspace","activity"].includes(slug)){
   const db=createClient();
   void db.from(project?"projects":"clans").select("id").eq("slug",slug).maybeSingle().then(({data})=>{if(active)setFocus(data?{path,kind:project?"project":"clan",id:data.id}:null);});
  }else setFocus(null);
  return()=>{active=false;};
 },[path]);
 if(!path.startsWith("/projects")&&!path.startsWith("/feed"))return null;
 if(path.endsWith("/settings")||path.endsWith("/new")||path.endsWith("/edit")||path.endsWith("/github"))return null;
 const area=path.startsWith("/projects")?"projects":path.includes("/clans/")?"clans":"feed";
 return <BlogsAnuCompanion area={area} focus={focus?.path===path?{kind:focus.kind,id:focus.id}:undefined}/>;
}
