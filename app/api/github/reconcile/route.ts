import { timingSafeEqual } from "node:crypto";
import { admin, configured } from "@/lib/github/app";
import { syncRepository, type Connection } from "@/lib/github/sync";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:Request) {
 const expected=Buffer.from(`Bearer ${process.env.CRON_SECRET??""}`);const actual=Buffer.from(request.headers.get("authorization")??"");
 if(!process.env.CRON_SECRET||expected.length!==actual.length||!timingSafeEqual(expected,actual))return new Response(null,{status:401});
 if(!configured())return Response.json({error:"Setup incomplete"},{status:503});
 const db=admin(); const {data,error}=await db.from("project_github_connections").select("*").or(`synced_at.is.null,synced_at.lt.${new Date(Date.now()-15*60*1000).toISOString()},sync_status.eq.pending`).order("last_attempt_at",{nullsFirst:true}).limit(4);
 if(error)return Response.json({error:"Storage unavailable"},{status:503});
 const results=await Promise.allSettled((data as Connection[]).map(syncRepository));
 return Response.json({processed:results.length,failed:results.filter(r=>r.status==="rejected").length},{headers:{"Cache-Control":"no-store"}});
}
