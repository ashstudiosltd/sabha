import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { FolderCode, Pencil, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectTeam } from "@/lib/projects/server";
import ProjectGitHub from "@/components/workspace/project-github";
import ProjectPublication from "@/components/workspace/project-publication";
export const dynamic = "force-dynamic";
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const supabase = await createClient();
  const [{ data: { user } }, team] = await Promise.all([supabase.auth.getUser(), getProjectTeam(project.id)]);
  const role = team.find((member) => member.profile_id === user?.id)?.role;
  const canEdit = role === "owner" || role === "maintainer";
  return <><header className="dv-page-intro"><div><p className="dv-eyebrow">Devvrats / Project</p><h1>{project.name}</h1>{project.tagline && <p>{project.tagline}</p>}<div className="dv-pills dv-project-badges"><span className="dv-pill">{project.visibility === "private" ? "Private" : "Public"}</span><span className="dv-pill">{project.publication_status === "draft" ? "Draft" : "Published"}</span><span className="dv-pill">{project.stage[0].toUpperCase() + project.stage.slice(1)}</span>{project.archived_at && <span className="dv-pill">Archived</span>}</div></div><div className="dv-project-actions">{canEdit && !project.archived_at && <Link href={`/projects/${project.slug}/edit`} className="dv-button"><Pencil size={14} />Edit project</Link>}{role === "owner" && <ProjectPublication key={project.version} project={project} />}</div></header>
    {project.archived_at && <p className="dv-status" role="status">This project is archived. Its published work remains available to authorized viewers.</p>}
    <ProjectGitHub id={project.id} slug={project.slug} owner={role === "owner"} member={!!role} archived={!!project.archived_at} />
    <div className="dv-project-columns"><section className="dv-surface dv-project-overview"><h2><FolderCode size={20} />Overview</h2><p className="dv-project-description">{project.description || "The story behind this project is still taking shape."}</p>{project.technologies.length > 0 && <><h3>Technologies</h3><div className="dv-pills">{project.technologies.map((tech) => <span key={tech} className="dv-pill">{tech}</span>)}</div></>}</section><aside className="dv-surface dv-project-people"><h2><Users size={18} />People</h2><ul>{team.map((member) => <li key={member.profile_id}><span className="dv-avatar">{member.avatar_url ? <Image src={member.avatar_url} alt="" width={38} height={38} unoptimized /> : (member.name || member.username || "D").slice(0, 1).toUpperCase()}</span><div>{member.username ? <Link href={`/profile/${encodeURIComponent(member.username)}`}>{member.name || member.username}</Link> : <span>{member.name || "Developer"}</span>}<small>{member.role[0].toUpperCase() + member.role.slice(1)}</small></div></li>)}</ul><p className="dv-note">Created <time dateTime={project.created_at}>{project.created_at.slice(0, 10)}</time></p></aside></div>
  </>;
}
