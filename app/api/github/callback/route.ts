import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { configured, origin, unseal, seal, FLOW_COOKIE, cookieOptions } from "@/lib/github/app";
export const runtime="nodejs";
export async function GET(request:NextRequest) {
 if(!configured()) return NextResponse.json({error:"GitHub setup is incomplete."},{status:503});
 const flow=unseal(request.cookies.get(FLOW_COOKIE)?.value);
 const code=request.nextUrl.searchParams.get("code");
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!flow||!flow.verifier||flow.token||flow.user!==user?.id||!code||request.nextUrl.searchParams.get("state")!==flow.state) return NextResponse.json({error:"GitHub authorization expired. Start again from your project."},{status:400});
 try {
  const result=await fetch("https://github.com/login/oauth/access_token",{method:"POST",cache:"no-store",signal:AbortSignal.timeout(15000),headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({client_id:process.env.GITHUB_APP_CLIENT_ID,client_secret:process.env.GITHUB_APP_CLIENT_SECRET,code,code_verifier:flow.verifier,redirect_uri:`${origin()}/api/github/callback`})});
  const value=await result.json(); if(!result.ok||!value.access_token) throw new Error("Authorization failed");
  const response=NextResponse.redirect(`${origin()}/projects/${flow.slug}/github`);
  response.cookies.set(FLOW_COOKIE,seal({...flow,token:value.access_token,expires:Date.now()+600000}),cookieOptions);
  response.headers.set("Cache-Control","no-store"); response.headers.set("Referrer-Policy","no-referrer"); return response;
 } catch { const response=NextResponse.json({error:"GitHub authorization failed. Start again from your project."},{status:502}); response.cookies.delete(FLOW_COOKIE);return response; }
}
