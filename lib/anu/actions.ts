import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { creationSlug, parseProjectInput } from "@/lib/projects/validation";
import { uuid, type AnuSource } from "./context";
import type { ProjectInput } from "@/lib/projects/types";

export type ActionDraft = { kind: "create_feed_post" | "create_feed_reply" | "create_feed_comment" | "create_blog_comment" | "create_project" | "update_project"; targetId?: string; clanId?: string; title?: string; body: string; project?: ProjectInput };
export type PreparedAction = { token: string; draft: ActionDraft; label: string; destination: string; expiresAt: number };
type SignedAction = { id: string; userId: string; draft: ActionDraft; expiresAt: number; version?: number };
type Db = Awaited<ReturnType<typeof createClient>>;
const kinds = new Set(["create_feed_post","create_feed_reply","create_feed_comment","create_blog_comment","create_project","update_project"]);
const labels: Record<string,string> = { create_feed_post:"Publish post",create_feed_reply:"Post reply",create_feed_comment:"Post comment",create_blog_comment:"Post comment",create_project:"Create project draft",update_project:"Save project changes" };
function secret() { const key=process.env.ANU_INTEGRATION_SECRET; if(!key)throw new Error("Anu’s action connection is unavailable.");return key; }
export function parseActionDraft(raw: unknown): ActionDraft {
  if (!raw || typeof raw !== "object") throw new Error("Invalid action draft.");
  const value = raw as Record<string,unknown>;
  if (!kinds.has(String(value.kind)) || typeof value.body !== "string" || !value.body.trim()) throw new Error("Check the action text.");
  const max = value.kind === "create_blog_comment" ? 1000 : value.kind === "create_feed_comment" ? 2000 : value.kind === "create_feed_reply" ? 5000 : 10000;
  if (value.body.trim().length > max) throw new Error(`This action allows at most ${max} characters.`);
  if(value.title != null && (typeof value.title!=="string" || value.title.length>140))throw new Error("Check the title.");
  if(value.targetId != null && !uuid.test(String(value.targetId)))throw new Error("Invalid destination.");
  if(value.clanId != null && !uuid.test(String(value.clanId)))throw new Error("Invalid Clan.");
  const draft: ActionDraft={kind:value.kind as ActionDraft["kind"],body:value.body.trim(),...(typeof value.title==="string"?{title:value.title.trim()}:{}),...(value.targetId?{targetId:String(value.targetId)}:{}),...(value.clanId?{clanId:String(value.clanId)}:{})};
  if(["create_feed_reply","create_feed_comment","create_blog_comment","update_project"].includes(draft.kind)&&!draft.targetId)throw new Error("Choose a destination first.");
  if(draft.kind==="create_project"||draft.kind==="update_project")draft.project=parseProjectInput({...(value.project as Record<string,unknown>),description:draft.body});
  return draft;
}
export function verifyActionToken(token: string,userId:string): SignedAction {
  if(typeof token!=="string"||token.length>40000)throw new Error("Invalid action confirmation.");
  const parts=token.split(".");if(parts.length!==2)throw new Error("Invalid action confirmation.");
  const expected=createHmac("sha256",secret()).update(parts[0]).digest(),actual=Buffer.from(parts[1],"base64url");
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error("Invalid action confirmation.");
  const action=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8")) as SignedAction;
  if(action.userId!==userId||!uuid.test(action.id)||!Number.isFinite(action.expiresAt)||action.expiresAt<=Date.now())throw new Error("This action draft expired or belongs to another account. Prepare it again.");
  action.draft=parseActionDraft(action.draft);return action;
}
export function draftUsesAllowedSources(draft:ActionDraft,sources:AnuSource[]) {
  if(draft.clanId&&!sources.some(s=>s.kind==="clan"&&s.id===draft.clanId))return false;
  if(!draft.targetId)return true;
  const kind=draft.kind==="create_blog_comment"?"blog":draft.kind==="update_project"?"project":"feed";
  return sources.some(s=>s.kind===kind&&s.id===draft.targetId);
}
async function destination(db:Db,userId:string,draft:ActionDraft) {
  if(draft.kind==="create_project")return {label:"Your new project draft",url:"/projects",version:undefined};
  if(draft.kind==="create_feed_post"){
    if(!draft.clanId)return {label:"Community Feed (visible to Sabha members)",url:"/feed",version:undefined};
    const [{data:clan,error},{data:member}]=await Promise.all([db.from("clans").select("id,slug,name,visibility").eq("id",draft.clanId).maybeSingle(),db.from("clan_members").select("user_id").eq("clan_id",draft.clanId).eq("user_id",userId).maybeSingle()]);
    if(error||!clan||!member)throw new Error("You no longer have permission to post in this Clan.");
    return {label:`${clan.name} (${clan.visibility} Clan)`,url:`/feed/clans/${encodeURIComponent(clan.slug)}`,version:undefined};
  }
  if(draft.kind==="update_project"){
    const [{data:project,error},{data:allowed}]=await Promise.all([db.from("projects").select("id,slug,name,version,visibility,archived_at").eq("id",draft.targetId).maybeSingle(),db.rpc("can_manage_project",{p_project_id:draft.targetId})]);
    if(error||!project||!allowed||project.archived_at)throw new Error("You cannot edit this project now.");
    return {label:`${project.name} (${project.visibility} project)`,url:`/projects/${encodeURIComponent(project.slug)}`,version:Number(project.version)};
  }
  const blog=draft.kind==="create_blog_comment";
  const {data:post,error}=await db.from(blog?"posts":"feed_posts").select("id,title").eq("id",draft.targetId).maybeSingle();
  if(error||!post)throw new Error("This destination is no longer accessible.");
  return {label:post.title||"Selected Feed conversation",url:`/${blog?"blogs":"feed"}/${post.id}`,version:undefined};
}
export async function prepareAction(db:Db,userId:string,raw:unknown):Promise<PreparedAction>{
  const draft=parseActionDraft(raw),target=await destination(db,userId,draft);
  const action:SignedAction={id:randomUUID(),userId,draft,expiresAt:Date.now()+10*60_000,...(target.version?{version:target.version}:{})};
  const payload=Buffer.from(JSON.stringify(action)).toString("base64url");
  return {token:`${payload}.${createHmac("sha256",secret()).update(payload).digest("base64url")}`,draft,label:labels[draft.kind],destination:target.label,expiresAt:action.expiresAt};
}
export async function executeAction(db:Db,userId:string,token:string){
  const action=verifyActionToken(token,userId),draft=action.draft,target=await destination(db,userId,draft);
  if(draft.kind==="update_project"){
    if(target.version!==action.version)throw new Error("This project changed. Ask Anu for a fresh draft before saving.");
    const p=draft.project!;
    const {data,error}=await db.rpc("save_project",{p_project_id:draft.targetId,p_expected_version:action.version,p_name:p.name,p_tagline:p.tagline,p_description:p.description,p_technologies:p.technologies,p_visibility:p.visibility,p_stage:p.stage}).single<{id:string;slug:string}>();
    if(error||!data)throw new Error("The project could not be saved. Permissions or its version may have changed.");
    return {message:"Project changes saved.",url:target.url};
  }
  if(draft.kind==="create_project"){
    const p=draft.project!,slug=creationSlug(p.name,action.id);
    const {data:existing}=await db.from("projects").select("id,slug").eq("slug",slug).eq("owner_id",userId).maybeSingle();
    if(existing)return {message:"Project draft already created.",url:`/projects/${existing.slug}`};
    const {data,error}=await db.rpc("create_project",{p_name:p.name,p_slug:slug,p_tagline:p.tagline,p_description:p.description,p_technologies:p.technologies,p_visibility:p.visibility,p_stage:p.stage}).single<{id:string;slug:string}>();
    if(error||!data)throw new Error("The project draft could not be created. Check your Projects workspace before retrying.");
    return {message:"Project draft created. It has not been published.",url:`/projects/${data.slug}`};
  }
  const blog=draft.kind==="create_blog_comment",post=draft.kind==="create_feed_post";
  const table=post?"feed_posts":blog?"comments":draft.kind==="create_feed_reply"?"feed_replies":"feed_comments";
  const row:Record<string,unknown>=post?{id:action.id,author_id:userId,post_type:"conversation",title:draft.title||null,body:draft.body,clan_id:draft.clanId||null}:blog?{id:action.id,user_id:userId,post_id:draft.targetId,content:draft.body}:{id:action.id,author_id:userId,post_id:draft.targetId,body:draft.body};
  const {error}=await db.from(table).insert(row);
  if(error){
    if(error.code!=="23505")throw new Error("This action was not completed. Your access or the destination may have changed.");
    const {data:existing}=await db.from(table).select("id").eq("id",action.id).eq(blog?"user_id":"author_id",userId).maybeSingle();
    if(!existing)throw new Error("The action could not be verified.");
  }
  return {message:post?"Post published.":draft.kind==="create_feed_reply"?"Reply posted.":"Comment posted.",url:post?`/feed/${action.id}`:target.url};
}
