import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/anu/context";
export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
export async function GET(request: Request) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user)return json({error:"Sign in to continue."},401);
 const scope=new URL(request.url).searchParams.get("scope")||"";
 if(!/^[a-z0-9:-]{1,120}$/i.test(scope))return json({error:"Invalid conversation."},400);
 const {data,error}=await db.from("anu_conversation_turns").select("id,question,answer,sources,context_sources,created_at").eq("user_id",user.id).eq("scope",scope).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(20);
 if(error)return json({error:"Conversation history is not available yet."},503);
 const tables:Record<string,string>={project:"projects",blog:"posts",feed:"feed_posts",clan:"clans",notification:"notifications"};
 const permitted=new Map<string,boolean>();
 const grouped=new Map<string,Set<string>>();
 for(const turn of data||[])for(const source of Array.isArray(turn.context_sources)?turn.context_sources:[]) {
  if(!source||!tables[source.kind]||!uuid.test(source.id||""))continue;
  const ids=grouped.get(source.kind)||new Set<string>();ids.add(source.id);grouped.set(source.kind,ids);
 }
 await Promise.all([...grouped].map(async([kind,ids])=>{
   let query=db.from(tables[kind]).select("id").in("id",[...ids]);
   if(kind==="notification")query=query.eq("recipient_id",user.id);
   const result=await query;
   if(!result.error)for(const row of result.data||[])permitted.set(`${kind}:${row.id}`,true);
 }));
 // Hide the whole answer if any source it could contain is no longer accessible.
 const turns=(data||[]).reverse().filter(turn=>Array.isArray(turn.context_sources)&&turn.context_sources.every((s:{kind:string;id:string})=>s && permitted.get(`${s.kind}:${s.id}`)));
 return json({turns});
}
export async function DELETE(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Invalid origin."},403);
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return json({error:"Sign in to continue."},401);
 const scope=new URL(request.url).searchParams.get("scope")||"";if(!/^[a-z0-9:-]{1,120}$/i.test(scope))return json({error:"Invalid conversation."},400);
 const {error}=await db.from("anu_conversation_turns").delete().eq("user_id",user.id).eq("scope",scope);
 return error?json({error:"The conversation couldn’t be cleared."},503):json({cleared:true});
}
