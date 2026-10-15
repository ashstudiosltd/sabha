import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectCursor, ProjectInput, ProjectTeamMember } from "./types";

export class ProjectDataError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "ProjectDataError"; }
}
function fail(error: { code?: string; message: string }): never {
  const code = error.code ?? "unknown";
  const messages: Record<string, string> = {
    "42501": "You don’t have permission to perform this project action.",
    "40001": "This project changed. Reload it before saving your changes.",
    "23505": "This project URL is already reserved. Choose another URL.",
    "23503": "The referenced Devvrats profile is unavailable.",
    "23514": "Check the project name, URL, technologies, visibility, and stage.",
    "55000": "Restore this project before changing it.",
    "PGRST202": "Projects storage is not available yet.",
    "42P01": "Projects storage is not available yet.",
  };
  throw new ProjectDataError(code, code === "22023" ? error.message : messages[code] ?? "The project couldn’t be saved. Please try again.");
}
/** RLS also protects lookups by ID or slug; inaccessible projects return null. */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("*").eq("slug", slug).maybeSingle();
  if (error) fail(error);
  return data as Project | null;
}
export async function listProjects({ scope = "public", limit = 20, cursor }: { scope?: "public" | "mine"; limit?: number; cursor?: ProjectCursor } = {}): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_projects", { p_scope: scope, p_limit: limit, p_after_created_at: cursor?.createdAt ?? null, p_after_id: cursor?.id ?? null });
  if (error) fail(error);
  return (data ?? []) as Project[];
}
export async function createProject(input: ProjectInput & { slug?: string }): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_project", { p_name: input.name, p_slug: input.slug ?? null, p_tagline: input.tagline, p_description: input.description, p_technologies: input.technologies, p_visibility: input.visibility, p_stage: input.stage }).single();
  if (error) fail(error);
  return data as Project;
}
export async function saveProject(id: string, expectedVersion: number, input: ProjectInput): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_project", { p_project_id: id, p_expected_version: expectedVersion, p_name: input.name, p_tagline: input.tagline, p_description: input.description, p_technologies: input.technologies, p_visibility: input.visibility, p_stage: input.stage }).single();
  if (error) fail(error);
  return data as Project;
}

export async function getProjectTeam(id: string): Promise<ProjectTeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_project_team", { p_project_id: id });
  if (error) fail(error);
  return (data ?? []) as ProjectTeamMember[];
}

export async function projectProfiles(projects: Project[]) {
 const ids=[...new Set(projects.map(p=>p.owner_id).filter((id):id is string=>!!id))];
 if(!ids.length)return [];
 const db=await createClient();const {data,error}=await db.from("profiles").select("id,name,username,avatar_url").in("id",ids);
 if(error)return [];
 return data as import("./types").ProjectProfile[];
}
