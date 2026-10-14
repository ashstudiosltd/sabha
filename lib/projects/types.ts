/** Existing profiles.id is the identity key; DID must extend that same identity. */
export const PROJECT_STAGES = ["idea", "prototype", "building", "launched", "maintaining", "paused", "completed"] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type ProjectVisibility = "public" | "private";
export type ProjectPublication = "draft" | "published";
export type ProjectRole = "owner" | "maintainer" | "contributor";

export interface Project {
  id: string;
  slug: string;
  owner_id: string | null;
  legacy_owner_pending: boolean;
  created_by: string | null;
  name: string;
  tagline: string;
  description: string;
  technologies: string[];
  visibility: ProjectVisibility;
  stage: ProjectStage;
  publication_status: ProjectPublication;
  published_at: string | null;
  archived_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface ProjectInput {
  name: string;
  tagline: string;
  description: string;
  technologies: string[];
  visibility: ProjectVisibility;
  stage: ProjectStage;
}
export interface ProjectMember {
  project_id: string;
  profile_id: string;
  role: Exclude<ProjectRole, "owner">;
  added_by: string | null;
  joined_at: string;
}
export interface ProjectCursor { createdAt: string; id: string }

export interface ProjectTeamMember { profile_id: string; name: string | null; username: string | null; avatar_url: string | null; role: ProjectRole; joined_at: string }
