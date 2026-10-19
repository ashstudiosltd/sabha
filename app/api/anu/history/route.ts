import { anuRequestAllowed } from "@/lib/anu/request-access";
import { createClient } from "@/lib/supabase/server";
import { accessibleTurns } from "@/lib/anu/history-access";
export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
export async function GET(request: Request) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user)return json({error:"Sign in to continue."},401);
 if(request.headers.has("x-anu-member")&&!anuRequestAllowed(request,user.id))return json({error:"Invalid portal account."},403);
 const scope=new URL(request.url).searchParams.get("scope")||"";
 if(!/^[a-z0-9:-]{1,120}$/i.test(scope))return json({error:"Invalid conversation."},400);
 const {data,error}=await db.from("anu_conversation_turns").select("id,question,answer,sources,context_sources,created_at").eq("user_id",user.id).eq("scope",scope).gt("created_at",new Date(Date.now()-45*86400000).toISOString()).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(20);
 if(error)return json({error:"Conversation history is not available yet."},503);
 const turns=await accessibleTurns(db,user.id,(data||[]).reverse());
 return json({turns});
}
export async function DELETE(request:Request){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return json({error:"Sign in to continue."},401);
 if(!anuRequestAllowed(request,user.id))return json({error:"Invalid origin or account."},403);
 const scope=new URL(request.url).searchParams.get("scope")||"";if(!/^[a-z0-9:-]{1,120}$/i.test(scope))return json({error:"Invalid conversation."},400);
 const {error}=await db.from("anu_conversation_turns").delete().eq("user_id",user.id).eq("scope",scope);
 return error?json({error:"The conversation couldn’t be cleared."},503):json({cleared:true});
}
