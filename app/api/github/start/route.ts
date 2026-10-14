import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects/server";
import { configured, origin, seal, FLOW_COOKIE, cookieOptions } from "@/lib/github/app";
export const runtime="nodejs";
export async function GET(request:NextRequest) {
 if(!configured()) return NextResponse.json({error:"GitHub connection setup is not complete."},{status:503});
 const slug=request.nextUrl.searchParams.get("project")??"";
 if(!/^[a-z0-9-]{2,80}$/.test(slug)) return NextResponse.json({error:"Invalid project"},{status:400});
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 const project=await getProjectBySlug(slug);
 if(!user||!project||project.owner_id!==user.id||project.archived_at) return NextResponse.json({error:"Only the owner can connect an active project."},{status:403});
 const state=randomBytes(32).toString("base64url");
 const verifier=randomBytes(32).toString("base64url");
 const url=new URL("https://github.com/login/oauth/authorize");
 url.searchParams.set("client_id",process.env.GITHUB_APP_CLIENT_ID!); url.searchParams.set("redirect_uri",`${origin()}/api/github/callback`); url.searchParams.set("state",state); url.searchParams.set("code_challenge",createHash("sha256").update(verifier).digest("base64url"));url.searchParams.set("code_challenge_method","S256");
 const response=NextResponse.redirect(url);
 response.cookies.set(FLOW_COOKIE,seal({user:user.id,project:project.id,slug,state,verifier,expires:Date.now()+600000}),cookieOptions);
 response.headers.set("Cache-Control","no-store"); return response;
}
