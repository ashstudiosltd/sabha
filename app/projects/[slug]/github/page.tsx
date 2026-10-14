import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects/server";
import { configured, FLOW_COOKIE, unseal, repositories } from "@/lib/github/app";
import RepositoryPicker from "@/components/workspace/github-repository-picker";
export const dynamic="force-dynamic";
export default async function GitHubPage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;const project=await getProjectBySlug(slug);const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!project||project.owner_id!==user?.id||project.archived_at)notFound();
 const flow=unseal((await cookies()).get(FLOW_COOKIE)?.value);
 let choices:Awaited<ReturnType<typeof repositories>>=[];let error="";
 if(!configured())error="GitHub connection setup is incomplete.";
 else if(!flow?.token||flow.user!==user!.id||flow.project!==project.id)error="Authorize GitHub to choose a repository.";
 else {try{choices=await repositories(flow.token);}catch{error="Repositories couldn’t be loaded. Authorize GitHub again to retry.";}}
 return <><header className="dv-page-intro"><div><p className="dv-eyebrow">{project.name}</p><h1>Connect your work.</h1><p>Choose one repository for this project’s activity.</p></div><Link href={`/projects/${slug}`} className="dv-button">Back to project</Link></header>{error?<section className="dv-surface dv-empty"><p>{error}</p>{configured()&&<a href={`/api/github/start?project=${slug}`} className="dv-button">Authorize GitHub</a>}</section>:choices.length?<RepositoryPicker slug={slug} repositories={choices.map(r=>({id:r.id,installation:r.installation,full_name:r.full_name,private:r.private}))}/>:<section className="dv-surface dv-empty"><h2>No repositories available yet.</h2><p>Install the GitHub App on a repository you own or can push to, then authorize again.</p><a className="dv-button" href={`https://github.com/apps/${encodeURIComponent(process.env.GITHUB_APP_SLUG??"")}/installations/new`} target="_blank" rel="noopener noreferrer">Install GitHub App</a><a className="dv-button" href={`/api/github/start?project=${slug}`}>Authorize again</a></section>}</>;
}
