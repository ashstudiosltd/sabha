"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {type SyncHealth} from "@/lib/github/health";
const labels={ready:"Up to date",syncing:"Syncing",preparing:"Preparing graph",stale:"Activity may be stale",failed:"Sync failed"};
export default function ProjectSyncStatus({id,initial}:{id:string;initial:SyncHealth}){
 const [health,setHealth]=useState(initial);const [error,setError]=useState(false);const [connected,setConnected]=useState(true);const router=useRouter();const previous=useRef(initial.syncedAt);const disconnected=useRef(false);
 useEffect(()=>{setHealth(initial);previous.current=initial.syncedAt;},[initial.state,initial.syncedAt,initial.attemptedAt,initial.detail]);
 useEffect(()=>{
  let active=true;let controller:AbortController|null=null;let busy=false;
  const update=async()=>{if(document.visibilityState!=="visible"||busy)return;busy=true;controller=new AbortController();try{const response=await fetch(`/api/github/status?project=${id}`,{cache:"no-store",signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json();if(!active)return;setError(false);setConnected(data.connected);if(!data.connected){if(!disconnected.current){disconnected.current=true;router.refresh();}return;}disconnected.current=false;
   if(data.health){setHealth(data.health);if(data.health.state==="ready"&&data.health.syncedAt!==previous.current){previous.current=data.health.syncedAt;router.refresh();}}
  }catch{if(active)setError(true);}finally{busy=false;}};
  const timer=setInterval(()=>void update(),30000);const focus=()=>void update();window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);void update();
  return()=>{active=false;controller?.abort();clearInterval(timer);window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus);};
 },[id,router]);
 if(!connected)return <p className="dv-note" role="status">The repository is disconnected.</p>;
 return <div className={`dv-sync-health ${health.state==="failed"?"dv-sync-health-error":""}`} role="status"><strong><span className={`dv-sync-dot ${health.state==="syncing"?"dv-sync-dot-active":""}`}/>{labels[health.state]}</strong><p>{health.detail}</p>{health.syncedAt&&<small>Last successful sync: {health.syncedAt.replace("T"," ").slice(0,16)} UTC</small>}{health.attemptedAt&&health.state!=="ready"&&<small>Last attempt: {health.attemptedAt.replace("T"," ").slice(0,16)} UTC</small>}{error&&<small>Live status couldn’t refresh. This is the last known state.</small>}</div>;
}
