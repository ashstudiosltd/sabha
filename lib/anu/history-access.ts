import "server-only";
import { createClient } from "@/lib/supabase/server";
import { repositoryMember } from "./repository";
import { uuid } from "./context";
type Turn={context_sources:unknown};
export async function accessibleTurns<T extends Turn>(db:Awaited<ReturnType<typeof createClient>>,userId:string,turns:T[]):Promise<T[]>{
 const tables:Record<string,string>={project:"projects",blog:"posts",feed:"feed_posts",clan:"clans",notification:"notifications"};
 const permitted=new Set<string>(),grouped=new Map<string,Set<string>>();
 for(const turn of turns)for(const source of Array.isArray(turn.context_sources)?turn.context_sources:[]){
  if(!source||(!tables[source.kind]&&source.kind!=="repository")||!uuid.test(source.id||""))continue;
  const ids=grouped.get(source.kind)||new Set<string>();ids.add(source.id);grouped.set(source.kind,ids);
 }
 await Promise.all([...grouped].map(async([kind,ids])=>{
  if(kind==="repository"){await Promise.all([...ids].map(async id=>{if(await repositoryMember(db,id,userId))permitted.add(`${kind}:${id}`);}));return;}
  let query=db.from(tables[kind]).select("id").in("id",[...ids]);if(kind==="notification")query=query.eq("recipient_id",userId);
  const result=await query;if(!result.error)for(const row of result.data||[])permitted.add(`${kind}:${row.id}`);
 }));
 return turns.filter(turn=>Array.isArray(turn.context_sources)&&turn.context_sources.every((s:{kind:string;id:string})=>s&&permitted.has(`${s.kind}:${s.id}`)));
}
