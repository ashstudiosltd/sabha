import "server-only";
import { createHash, createCipheriv, createDecipheriv, randomBytes, createSign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
export function configured() { return ["GITHUB_APP_ID","GITHUB_APP_CLIENT_ID","GITHUB_APP_CLIENT_SECRET","GITHUB_APP_PRIVATE_KEY","GITHUB_APP_SLUG","GITHUB_APP_ORIGIN","SUPABASE_SERVICE_ROLE_KEY","GITHUB_WEBHOOK_SECRET"].every(k => !!process.env[k]); }
export function origin() { const url = new URL(process.env.GITHUB_APP_ORIGIN!); if (url.protocol !== "https:" && !["localhost","127.0.0.1"].includes(url.hostname)) throw new Error("Invalid GitHub origin"); return url.origin; }
export function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function github<T>(path: string, token: string, options: RequestInit = {}): Promise<{ data: T; status: number }> {
 const response = await fetch(`https://api.github.com${path}`, { ...options, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000), headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2026-03-10", ...options.headers } });
 if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
 return { data: response.status === 204 ? null as T : await response.json() as T, status: response.status };
}
export async function installationToken(id: number, repositoryId: number) {
 const now = Math.floor(Date.now()/1000);
 const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
 const body = `${encode({alg:"RS256",typ:"JWT"})}.${encode({iat:now-60,exp:now+540,iss:process.env.GITHUB_APP_ID})}`;
 const signature = createSign("RSA-SHA256").update(body).sign(process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g,"\n")).toString("base64url");
 const {data} = await github<{token:string}>(`/app/installations/${id}/access_tokens`, `${body}.${signature}`, {method:"POST", body:JSON.stringify({repository_ids:[repositoryId],permissions:{contents:"read",metadata:"read"}})});
 return data.token;
}
export type Flow = { user: string; project: string; slug: string; state: string; verifier: string; expires: number; token?: string };
export const FLOW_COOKIE = "dv_github_flow";
export const cookieOptions = { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax" as const, path:"/", maxAge:600 };
function key() { return createHash("sha256").update(process.env.GITHUB_APP_CLIENT_SECRET!).digest(); }
export function seal(flow:Flow) { const iv=randomBytes(12); const cipher=createCipheriv("aes-256-gcm",key(),iv); const value=Buffer.concat([cipher.update(JSON.stringify(flow)),cipher.final()]); return Buffer.concat([iv,cipher.getAuthTag(),value]).toString("base64url"); }
export function unseal(value?:string):Flow|null { try { if(!value || value.length>6000) return null; const bytes=Buffer.from(value,"base64url"); const decipher=createDecipheriv("aes-256-gcm",key(),bytes.subarray(0,12)); decipher.setAuthTag(bytes.subarray(12,28)); const flow=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString()) as Flow; return flow.expires>Date.now()?flow:null; } catch {return null;} }
export interface Repository { id:number; full_name:string; default_branch:string; private:boolean; stargazers_count:number; forks_count:number; permissions?:{admin?:boolean;push?:boolean} }
export interface Choice extends Repository { installation:number }
export async function repositories(token:string):Promise<Choice[]> {
 const choices:Choice[]=[];
 for(let page=1;page<=20;page++) {
  const {data}=await github<{installations:{id:number;app_id:number;suspended_at:string|null}[]}>(`/user/installations?per_page=100&page=${page}`,token);
  for(const install of data.installations.filter(i=>String(i.app_id)===process.env.GITHUB_APP_ID && !i.suspended_at)) {
   for(let p=1;p<=100;p++) {
    const {data:repos}=await github<{repositories:Repository[]}>(`/user/installations/${install.id}/repositories?per_page=100&page=${p}`,token);
    choices.push(...repos.repositories.filter(r=>r.permissions?.admin || r.permissions?.push).map(r=>({...r,installation:install.id})));
    if(repos.repositories.length<100) break;
    if(p===100) throw new Error("Too many repositories");
   }
  }
  if(data.installations.length<100) return choices;
 }
 throw new Error("Too many installations");
}
