"use client";
import { useState } from "react";
export type ActionPreview={token:string;draft:{kind:string;body:string;title?:string;targetId?:string;clanId?:string;project?:Record<string,unknown>};label:string;destination:string;expiresAt:number};
export function AnuActionCard({action,endpoint="/api/anu/actions"}:{action:ActionPreview;endpoint?:string}){
 const [body,setBody]=useState(action.draft.body),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<{message:string;url:string}|null>(null),[cancelled,setCancelled]=useState(false);
 if(cancelled)return <p className="anu-action-status">Draft dismissed. Nothing was changed.</p>;
 if(result)return <div className="anu-action-card" role="status"><strong>{result.message}</strong><a href={result.url} target="_blank" rel="noreferrer">View in Sabha ↗</a></div>;
 return <section className="anu-action-card" aria-label="Review Anu’s action draft">
  <strong>{action.label}</strong><p>{action.destination}</p>
  {action.draft.title&&<h4>{action.draft.title}</h4>}
  {action.draft.project&&<dl>{["name","tagline","stage","visibility","technologies"].map(key=><div key={key}><dt>{key}</dt><dd>{Array.isArray(action.draft.project![key])?(action.draft.project![key] as string[]).join(", "):String(action.draft.project![key]??"")}</dd></div>)}</dl>}
  <textarea aria-label="Edit action text" value={body} onChange={event=>setBody(event.target.value)} disabled={busy} maxLength={10000} rows={4}/>
  <small>Review the text and destination. Nothing is published until you confirm.</small>
  {error&&<p role="alert">{error}</p>}
  <div className="anu-action-buttons"><button type="button" disabled={busy||!body.trim()} onClick={async()=>{
   setBusy(true);setError("");
   try{
    let token=action.token;
    if(body!==action.draft.body){
     const draft={...action.draft,body,...(action.draft.project?{project:{...action.draft.project,description:body}}:{})};
     const prepared=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:"prepare",draft})});
     const data=await prepared.json() as {error?:string;action?:ActionPreview};if(!prepared.ok||!data.action?.token)throw new Error(data.error||"Could not prepare your edits.");token=data.action.token;
    }
    const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:"execute",token})});
    const data=await response.json() as {error?:string;url:string;message:string};if(!response.ok)throw new Error(data.error||"This action did not complete.");
    const url=new URL(data.url,"https://sabha.devvrats.in");if(url.origin!=="https://sabha.devvrats.in")throw new Error("The action returned an invalid destination.");
    setResult({message:data.message,url:url.toString()});
   }catch(failure){setError(failure instanceof Error?failure.message:"This action did not complete.");}finally{setBusy(false);}
  }}>{busy?"Saving…":"Confirm"}</button><button type="button" disabled={busy} onClick={()=>setCancelled(true)}>Cancel</button></div>
 </section>;
}
