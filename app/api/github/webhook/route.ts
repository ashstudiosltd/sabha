import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { admin } from "@/lib/github/app";
import { syncRepository, type Connection } from "@/lib/github/sync";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request) {
 if(!process.env.GITHUB_WEBHOOK_SECRET||!process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({error:"Webhook setup incomplete"},{status:503});
 if(Number(request.headers.get("content-length")??0)>2_000_000) return new Response(null,{status:413});
 const reader=request.body?.getReader(); if(!reader) return new Response(null,{status:400});
 const chunks:Uint8Array[]=[];let size=0;
 while(true) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}
 const raw=Buffer.concat(chunks);
 const expected=Buffer.from(`sha256=${createHmac("sha256",process.env.GITHUB_WEBHOOK_SECRET).update(raw).digest("hex")}`);
 const signature=Buffer.from(request.headers.get("x-hub-signature-256")??"");
 if(signature.length!==expected.length||!timingSafeEqual(signature,expected)) return new Response(null,{status:401});
 let payload;try {payload=JSON.parse(raw.toString());}catch{return new Response(null,{status:400});}
 const event=request.headers.get("x-github-event");
 if(event==="ping") return Response.json({ok:true});
 if(!["push","repository","star","fork","installation","installation_repositories"].includes(event??"")) return Response.json({ok:true});
 const installation=payload.installation?.id;
 if(!Number.isSafeInteger(installation)) return new Response(null,{status:400});
 const db=admin();
 let query=db.from("project_github_connections").select("*").eq("installation_id",installation);
 if(payload.repository?.id) query=query.eq("repository_id",payload.repository.id);
 const {data,error}=await query;if(error)return Response.json({error:"Storage unavailable"},{status:503});
 const revoked=event==="installation" && ["deleted","suspend"].includes(payload.action);
 const removed=new Set<number>((payload.repositories_removed??[]).map((r:{id:number})=>r.id));
 const connections=(data??[]) as Connection[];
 for(const c of connections) {
  const unavailable=revoked||removed.has(Number(c.repository_id))||(event==="repository"&&payload.action==="deleted");
  // Fence in-flight refreshes so an old result cannot undo a privacy/revocation event.
  const result=await db.from("project_github_connections").update({public_ready:false,sync_status:unavailable?"unavailable":"pending",sync_lease:null,sync_started_at:null}).eq("project_id",c.project_id).eq("connection_id",c.connection_id);
  if(result.error)return Response.json({error:"Storage unavailable"},{status:503});
  if(!unavailable) after(async()=>{try{await syncRepository(c);}catch{/* Scheduled reconciliation retries safely. */}});
 }
 return Response.json({ok:true});
}
