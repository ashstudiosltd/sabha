import { accessibleTurns } from "@/lib/anu/history-access";
import { createClient } from "@/lib/supabase/server";
import { anuRequestAllowed } from "@/lib/anu/request-access";
export const dynamic="force-dynamic";
const json=(body:object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
export async function GET(request:Request){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return json({error:"Sign in to continue."},401);
 if(request.headers.has("x-anu-member")&&!anuRequestAllowed(request,user.id))return json({error:"Invalid portal account."},403);
 let query=db.from("anu_conversation_turns").select("id,scope,question,created_at,context_sources").eq("user_id",user.id).like("scope","portal:%").gt("created_at",new Date(Date.now()-45*86400000).toISOString()).order("created_at",{ascending:false});
 const q=new URL(request.url).searchParams.get("q")||"";
 const words=[...new Set(q.toLowerCase().match(/[\p{L}\p{N}]{2,48}/gu)||[])].slice(0,8);
 if(words.length)query=query.or(words.flatMap(word=>[`question.ilike.%${word}%`,`answer.ilike.%${word}%`]).join(","));
 const {data,error}=await query.limit(400);
 if(error)return json({error:"Sabha chat history is unavailable."},503);
 const scopes=new Map<string,{id:string;title:string;updatedAt:number;revision:number;space:string;messages:never[];loaded:boolean}>();
 const permitted=await accessibleTurns(db,user.id,data||[]);
 for(const turn of permitted)if(!scopes.has(turn.scope)&&/^portal:[0-9a-f-]{36}$/i.test(turn.scope))scopes.set(turn.scope,{id:turn.scope.slice(7),title:turn.question.slice(0,46),updatedAt:Date.parse(turn.created_at),revision:1,space:"devvrats",messages:[],loaded:false});
 return json({conversations:[...scopes.values()].slice(0,20)});
}
