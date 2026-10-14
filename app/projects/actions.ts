"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createProject, getProjectBySlug, listProjects, ProjectDataError, saveProject } from "@/lib/projects/server";
import { creationSlug, parseProjectInput, PROJECT_UUID, validVersion } from "@/lib/projects/validation";
import type { Project, ProjectCursor } from "@/lib/projects/types";

type Failure = { ok: false; error: string; code: string };
type Saved = { ok: true; project: Project };
function failure(cause: unknown): Failure {
  if (cause instanceof ProjectDataError) return { ok: false, error: cause.message, code: cause.code };
  return { ok: false, error: cause instanceof Error ? cause.message : "This action couldn’t be completed. Try again.", code: "validation" };
}
async function signedIn() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new ProjectDataError("auth", "Sign in to save your project.");
  return user;
}
function invalidate(project: Project) { revalidatePath("/projects"); revalidatePath(`/projects/${project.slug}`); revalidatePath(`/projects/${project.slug}/edit`); }
export async function createAccountProject(raw: unknown, requestId: string, originalName: string): Promise<Saved | Failure> {
  try {
    const user = await signedIn();
    const input = parseProjectInput(raw);
    if (typeof originalName !== "string" || originalName.length > 80) throw new Error("Check your project name.");
    const slug = creationSlug(originalName, requestId);
    // A stable operation URL recovers a committed create after a lost response.
    const existing = await getProjectBySlug(slug);
    if (existing?.owner_id === user.id) return { ok: true, project: existing };
    let project: Project;
    try { project = await createProject({ ...input, slug }); }
    catch (cause) {
      if (!(cause instanceof ProjectDataError) || cause.code !== "23505") throw cause;
      const recovered = await getProjectBySlug(slug);
      if (!recovered || recovered.owner_id !== user.id) throw cause;
      project = recovered;
    }
    invalidate(project);
    return { ok: true, project };
  } catch (cause) { return failure(cause); }
}
export async function updateAccountProject(id: string, version: number, raw: unknown): Promise<Saved | Failure> {
  try {
    await signedIn();
    if (!PROJECT_UUID.test(id) || !validVersion(version)) throw new Error("Reload the project before saving.");
    const project = await saveProject(id, version, parseProjectInput(raw));
    invalidate(project); return { ok: true, project };
  } catch (cause) { return failure(cause); }
}
export async function changeProjectPublication(id: string, version: number, published: boolean): Promise<Saved | Failure> {
  try {
    await signedIn();
    if (!PROJECT_UUID.test(id) || !validVersion(version) || typeof published !== "boolean") throw new Error("Reload the project before publishing.");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_project_publication", { p_project_id: id, p_expected_version: version, p_published: published }).single();
    if (error) throw new ProjectDataError(error.code, error.code === "40001" ? "This project changed. Reload it before publishing." : "Your publishing change couldn’t be saved. Check your access and try again.");
    const project = data as Project; invalidate(project); return { ok: true, project };
  } catch (cause) { return failure(cause); }
}
export async function loadProjectPage(scope: "public" | "mine", cursor: ProjectCursor): Promise<{ ok: true; projects: Project[]; hasMore: boolean } | Failure> {
  try {
    if (scope !== "public" && scope !== "mine") throw new Error("Choose a project collection.");
    if (scope === "mine") await signedIn();
    if (!cursor || !PROJECT_UUID.test(cursor.id) || typeof cursor.createdAt !== "string" || Number.isNaN(Date.parse(cursor.createdAt))) throw new Error("Reload this project collection.");
    const rows = await listProjects({ scope, limit: 21, cursor });
    return { ok: true, projects: rows.slice(0, 20), hasMore: rows.length > 20 };
  } catch (cause) { return failure(cause); }
}
