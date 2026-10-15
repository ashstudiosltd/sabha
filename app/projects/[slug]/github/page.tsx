import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects/server";
import { admin, configured, FLOW_COOKIE, unseal, repositories } from "@/lib/github/app";
import RepositoryPicker from "@/components/workspace/github-repository-picker";
export const dynamic="force-dynamic";
export default async function GitHubPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{notice?:string}>}) {
 const [{slug},{notice}]=await Promise.all([params,searchParams]);const project=await getProjectBySlug(slug);const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!project||project.owner_id!==user?.id||project.archived_at)notFound();
 const flow=unseal((await cookies()).get(FLOW_COOKIE)?.value);
 let current:{id:number;installation:number;name:string}|null=null;
 if(configured()){const {data:c}=await admin().from("project_github_connections").select("repository_id,installation_id,full_name").eq("project_id",project.id).maybeSingle();if(c)current={id:c.repository_id,installation:c.installation_id,name:c.full_name};}
 const notices:Record<string,string>={cancelled:"GitHub authorization was cancelled. Your current connection is unchanged.",expired:"Authorization expired. Start again to choose a repository.",authorization:"GitHub authorization failed. You can retry without changing the current connection.",access:"Project access changed. Only its current owner can connect a repository.",storage:"The connection couldn’t be loaded. Check the GitHub database setup."};
 let choices:Awaited<ReturnType<typeof repositories>>=[];let error="";
 if(!configured())error="GitHub connection setup is incomplete.";
 else if(!flow?.token||flow.user!==user!.id||flow.project!==project.id)error="Authorize GitHub to choose a repository.";
 else {try{choices=await repositories(flow.token);}catch{error="Repositories couldn’t be loaded. Authorize GitHub again to retry.";}}
 return <>{notice&&notices[notice]&&<p className="dv-status" role="status">{notices[notice]}</p>}<header className="dv-page-intro"><div><p className="dv-eyebrow">{project.name}</p><h1>Connect your work.</h1><p>Choose one repository for this project’s activity.</p></div><Link href={`/projects/${slug}?tab=development`} className="dv-button">Back to project</Link></header>{error?<section className="dv-surface dv-empty"><p>{error}</p>{configured()&&<a href={`/api/github/start?project=${slug}`} className="dv-button">Authorize GitHub</a>}</section>:choices.length?<RepositoryPicker current={current} slug={slug} repositories={choices.map(r=>({id:r.id,installation:r.installation,full_name:r.full_name,private:r.private,default_branch:r.default_branch}))}/>:<section className="dv-surface dv-empty"><h2>No repositories available yet.</h2><p>Install the GitHub App on a repository you own or can push to, then authorize again.</p><a className="dv-button" href={`https://github.com/apps/${encodeURIComponent(process.env.GITHUB_APP_SLUG??"")}/installations/new`} target="_blank" rel="noopener noreferrer">Install GitHub App</a><a className="dv-button" href={`/api/github/start?project=${slug}`}>Authorize again</a></section>}</>;
}
