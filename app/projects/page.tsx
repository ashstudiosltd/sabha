import { redirect } from "next/navigation";
import ProjectsHome from "@/components/workspace/projects-home";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects/server";
import type { Project } from "@/lib/projects/types";
export const dynamic = "force-dynamic";
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const mine = (await searchParams).view === "mine";
  if (mine) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth?next=%2Fprojects%3Fview%3Dmine");
  }
  let rows: Project[] = [], error: string | null = null;
  try { rows = await listProjects({ scope: mine ? "mine" : "public", limit: 21 }); }
  catch { error = "Projects couldn’t load. Please refresh and try again."; }
  const projects = rows.slice(0, 20);
  return <ProjectsHome key={`${mine}:${projects.map((project) => `${project.id}:${project.version}`).join(",")}:${error}`} mine={mine} initialProjects={projects} initialHasMore={rows.length > 20} loadError={error} />;
}
