import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectTeam } from "@/lib/projects/server";
import ProjectEditor from "@/components/workspace/project-editor";
export const dynamic = "force-dynamic";
export const metadata = { title: "Edit project" };
export default async function EditProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/projects/${slug}/edit`)}`);
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const team = await getProjectTeam(project.id);
  const role = team.find((member) => member.profile_id === user.id)?.role;
  if (role !== "owner" && role !== "maintainer") redirect(`/projects/${project.slug}`);
  return <ProjectEditor key={project.id} project={project} canChangeVisibility={role === "owner"} />;
}
