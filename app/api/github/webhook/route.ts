import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { admin } from "@/lib/github/app";
import { syncRepository, type Connection } from "@/lib/github/sync";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request) {
 if(!process.env.GITHUB_WEBHOOK_SECRET||!process.env.SUPABASE_SERVICE_ROLE_KEY)return Response.json({error:"Webhook setup incomplete"},{status:503});
 const maxBytes=25*1024*1024;
 if(Number(request.headers.get("content-length")??0)>maxBytes)return new Response(null,{status:413});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}}catch{return new Response(null,{status:400});}
 const raw=Buffer.concat(chunks);const expected=Buffer.from(`sha256=${createHmac("sha256",process.env.GITHUB_WEBHOOK_SECRET).update(raw).digest("hex")}`);const signature=Buffer.from(request.headers.get("x-hub-signature-256")??"");
 if(signature.length!==expected.length||!timingSafeEqual(signature,expected))return new Response(null,{status:401});
 let payload;try{payload=JSON.parse(raw.toString());}catch{return new Response(null,{status:400});}
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return new Response(null,{status:400});
 const event=request.headers.get("x-github-event");if(event==="ping")return Response.json({ok:true});
 if(!["push","repository","star","fork","installation","installation_repositories"].includes(event??""))return Response.json({ok:true});
 const installation=payload.installation?.id;const repositoryId=payload.repository?.id;
 const delivery=request.headers.get("x-github-delivery")??"";
 if(!Number.isSafeInteger(installation)||installation<=0||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(delivery))return new Response(null,{status:400});
 if(["push","repository","star","fork"].includes(event??"")&&(!Number.isSafeInteger(repositoryId)||repositoryId<=0))return new Response(null,{status:400});
 if(payload.repositories_removed!==undefined&&!Array.isArray(payload.repositories_removed))return new Response(null,{status:400});
 const removed=(payload.repositories_removed??[]).map((r:{id:number})=>r?.id);if(removed.some((id:unknown)=>!Number.isSafeInteger(id)||Number(id)<=0))return new Response(null,{status:400});
 const revoked=(event==="installation"&&["deleted","suspend"].includes(payload.action))||(event==="repository"&&payload.action==="deleted");
 const {data,error}=await admin().rpc("prepare_project_github_delivery",{p_delivery_id:delivery,p_installation_id:installation,p_repository_id:repositoryId??null,p_revoked:revoked,p_removed_ids:removed});
 if(error)return Response.json({error:"Storage unavailable"},{status:503});
 const connections=(data??[]) as Connection[];
 after(async()=>{for(let i=0;i<connections.length;i+=4){await Promise.allSettled(connections.slice(i,i+4).filter(c=>c.sync_status!=="unavailable").map(syncRepository));}});
 return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
