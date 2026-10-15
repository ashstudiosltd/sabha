"use client";
import { useEffect, useRef, useState } from "react";
/** Protect edits on refresh and intentional navigation without changing router behavior. */
export function useProjectUnsaved(dirty:boolean) {
 const [destination,setDestination]=useState<string|null>(null);
 const leaving=useRef(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  if(!dirty)return;
  const unload=(event:BeforeUnloadEvent)=>{if(leaving.current)return;event.preventDefault();event.returnValue="";};
  const navigate=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>("a[href]"):null;
   if(!anchor||anchor.hasAttribute("download")||(anchor.target&&anchor.target!=="_self"))return;
   const url=new URL(anchor.href,window.location.href);
   if(!["http:","https:"].includes(url.protocol)||url.href===window.location.href||(url.origin===location.origin&&url.pathname===location.pathname&&url.search===location.search))return;
   event.preventDefault();event.stopImmediatePropagation();setDestination(url.href);
  };
  window.addEventListener("beforeunload",unload);window.addEventListener("click",navigate,true);
  return()=>{window.removeEventListener("beforeunload",unload);window.removeEventListener("click",navigate,true);};
 },[dirty]);
 useEffect(()=>{if(destination&&!dialog.current?.open)dialog.current?.showModal();},[destination]);
 return <dialog ref={dialog} className="dv-discard-dialog" onCancel={()=>setDestination(null)} onClose={()=>setDestination(null)} aria-labelledby="dv-discard-title"><h2 id="dv-discard-title">Leave unsaved changes?</h2><p>Your changes haven’t been saved to your account. Stay here to save them before leaving.</p><div className="dv-project-actions"><button type="button" className="dv-button dv-button-primary" onClick={()=>dialog.current?.close()}>Keep editing</button><button type="button" className="dv-button" onClick={()=>{if(destination){const target=destination;leaving.current=true;dialog.current?.close();window.location.assign(target);}}}>Leave page</button></div></dialog>;
}
