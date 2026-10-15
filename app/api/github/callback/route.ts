import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects/server";
import { configured, origin, unseal, seal, FLOW_COOKIE, cookieOptions } from "@/lib/github/app";
export const runtime="nodejs";
export async function GET(request:NextRequest) {
 if(!configured()) return NextResponse.json({error:"GitHub setup is incomplete."},{status:503});
 const flow=unseal(request.cookies.get(FLOW_COOKIE)?.value);
 const code=request.nextUrl.searchParams.get("code");
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 const fail=(notice:string)=>{const destination=flow&&flow.user===user?.id?`/projects/${flow.slug}/github?notice=${notice}`:"/projects";const response=NextResponse.redirect(`${origin()}${destination}`);response.cookies.delete(FLOW_COOKIE);response.headers.set("Cache-Control","no-store");response.headers.set("Referrer-Policy","no-referrer");return response;};
 if(!flow||!flow.verifier||flow.token||flow.user!==user?.id||!code||request.nextUrl.searchParams.get("state")!==flow.state)return fail(request.nextUrl.searchParams.get("error")==="access_denied"?"cancelled":"expired");
 const project=await getProjectBySlug(flow.slug);if(!project||project.id!==flow.project||project.owner_id!==user?.id||project.archived_at)return fail("access");
 try {
  const result=await fetch("https://github.com/login/oauth/access_token",{method:"POST",cache:"no-store",signal:AbortSignal.timeout(15000),headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({client_id:process.env.GITHUB_APP_CLIENT_ID,client_secret:process.env.GITHUB_APP_CLIENT_SECRET,code,code_verifier:flow.verifier,redirect_uri:`${origin()}/api/github/callback`})});
  const value=await result.json(); if(!result.ok||!value.access_token) throw new Error("Authorization failed");
  const response=NextResponse.redirect(`${origin()}/projects/${flow.slug}/github`);
  response.cookies.set(FLOW_COOKIE,seal({...flow,token:value.access_token,expires:Date.now()+600000}),cookieOptions);
  response.headers.set("Cache-Control","no-store"); response.headers.set("Referrer-Policy","no-referrer"); return response;
 } catch { return fail("authorization"); }
}
