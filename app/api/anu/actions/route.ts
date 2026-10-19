import { createClient } from "@/lib/supabase/server";
import { anuRequestAllowed } from "@/lib/anu/request-access";
import { executeAction, prepareAction } from "@/lib/anu/actions";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const json=(body:object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
export async function POST(request:Request){
  const db=await createClient();const {data:{user}}=await db.auth.getUser();
  if(!user)return json({error:"Sign in to continue."},401);
  if(!anuRequestAllowed(request,user.id))return json({error:"Invalid request origin or account."},403);
  try{
    const raw=await request.text();if(new TextEncoder().encode(raw).length>60000)return json({error:"This action is too large."},413);
    const body=JSON.parse(raw);
    if(body.intent==="prepare")return json({action:await prepareAction(db,user.id,body.draft)});
    if(body.intent!=="execute"||typeof body.token!=="string")return json({error:"Invalid action."},400);
    return json(await executeAction(db,user.id,body.token));
  }catch(error){return json({error:error instanceof Error?error.message:"This action could not be completed."},400);}
}
