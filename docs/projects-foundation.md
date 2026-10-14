# Projects data and permissions

## Apply

Run the complete `supabase/migrations/20261016_projects_foundation.sql` file in the **existing shared Devvrats/Sabha Supabase project**. It requires `public.profiles(id uuid)` with the existing name, username, and avatar_url fields. No separate Supabase project or identity table is needed.

Then run `supabase/setup/check-projects-foundation.sql`. All six checks should report PASS. These checks do not create sample users or projects. The migration has been tested from a profiles-only database and rerun successfully. The verified legacy projects table (id, title, description, project_url) is upgraded in place. IDs, original titles, and URLs are retained; null descriptions become empty text in the new schema. An exact original-record snapshot, including nulls and full-length titles, is kept in the private project_legacy_imports table. Other unrecognized schemas still stop and roll back.

The user has applied the database foundation and reported all six setup checks passing. Projects now uses the current Supabase session for account drafts, discovery, editing, and owner-controlled publishing. Existing browser drafts are preserved and available to import.

## Identity and records

- `projects.id`: permanent UUID. External repositories, Posts, Blogs, Clans, and DID evidence should ultimately reference this ID, rather than a project name.
- `projects.slug`: unique, lowercase URL segment, 3–80 characters. It remains unchanged when a project is renamed.
- `project_slug_reservations`: private URL registry. Deleted URLs stay reserved, so old links cannot silently resolve to a different project.
- `projects.owner_id`: references the existing `profiles.id`. This is the single authoritative owner record. It is required for all new projects. Only legacy imports may have a null owner, guarded by legacy_owner_pending and mandatory private/draft status.
- `projects.created_by`: original creator, independent of current ownership. It can become null if the former creator's profile is deleted.
- `project_members.profile_id`: references the same existing profile. It contains maintainer/contributor assignments; owner is resolved from the project record.
- `project_audit_events`: internal change history, readable only by owners and maintainers. It records event types and changed field names rather than copying private descriptions into activity logs.

DID should extend the current profile identity or reference it through a one-to-one record. Changing usernames, adding credentials, or connecting GitHub must not replace `profiles.id`. Project membership does not grant GitHub repository access. Clan membership likewise does not automatically grant Project access.

## Legacy records without ownership

The old four-column table has no reliable creator or owner information. Imported records therefore remain hidden from API clients until an administrator assigns an existing profile. Ownership is never inferred from a title, URL, or the first account found in the database. Normal creation still requires a signed-in profile and cannot create an ownerless record.

The administrator-only `assign_legacy_project_owner(project_id, owner_profile_id)` function can assign a verified existing profile using SQL Editor. It is not executable by anon/authenticated clients. It clears the pending flag, keeps the project private and unpublished, and records `legacy_owner_assigned` in the internal audit. The original creator stays unknown rather than being fabricated. There is no public claim workflow.

The retained legacy `title` column is filled automatically for new projects and mirrors later name edits. Original legacy values remain in `project_legacy_imports` even after editing. Its snapshots are accessible only to database administration and are removed if the corresponding project is explicitly deleted.

## Field rules

| Field | Rule |
| --- | --- |
| Name | 2–80 characters, trimmed |
| Tagline | Up to 180 characters |
| Description | Up to 10,000 characters; treated as content, never executable HTML |
| Technologies | Up to 20 names; each 1–40 characters; normalized to lowercase, trimmed, deduplicated and sorted |
| Visibility | public / private; private by default |
| Stage | idea / prototype / building / launched / maintaining / paused / completed |
| Publication | draft / published; draft by default |
| Archive | Separate archived_at timestamp; independent of stage and publication |
| Version | Monotonic integer used to reject stale edits |

An automatically generated URL uses the project name plus an ID suffix. Explicit URLs cannot use reserved route names such as new, activity, settings, or api. Name changes do not change the URL.

## Access matrix

| Action | Owner | Maintainer | Contributor | Visitor |
| --- | --- | --- | --- | --- |
| Read draft | Yes | Yes | No | No |
| Read published private project | Yes | Yes | Yes, while a member | No |
| Read published public project | Yes | Yes | Yes | Yes |
| Edit project content and stage | Yes | Yes | No | No |
| Change visibility | Yes | No | No | No |
| Publish / unpublish | Yes | No | No | No |
| Manage team roles | Yes | No | No | No |
| Read internal audit | Yes | Yes | No | No |
| Archive / restore | Yes | No | No | No |
| Transfer / delete | Yes, with name confirmation | No | No | No |
| Leave team | Transfer first | Yes | Yes | — |

Public preference does not publish a draft. Contributors lose draft access when the owner unpublishes. Archived projects remain readable to authorized viewers but disappear from public discovery. Content edits, publication changes, and team additions/role changes are blocked while archived. Ownership transfer, owner deletion, and a member voluntarily leaving remain available.

Owner profile deletion is restricted while that profile owns projects. Transfer or delete the projects first. Deleting a project removes its team and internal audit but preserves its URL reservation.

## Database operations

Clients have SELECT access under RLS and **no direct INSERT, UPDATE, DELETE, or TRUNCATE** privileges on the Project tables. Mutation RPCs derive the actor from `auth.uid()` and lock the project row before checking current permissions. Internal helpers are not callable by clients. All SECURITY DEFINER functions use an empty search path and fully qualified application tables.

| RPC | Purpose |
| --- | --- |
| create_project | Create an account-owned draft; optional explicit slug |
| save_project | Save content, technologies, visibility, and stage with expected version |
| set_project_publication | Owner publishes/unpublishes with expected version |
| set_project_archived | Owner archives/restores with expected version |
| set_project_member | Owner assigns an existing profile as maintainer/contributor |
| remove_project_member | Owner removes a team member, or a member leaves |
| transfer_project_ownership | Owner transfers to an existing team member; previous owner becomes maintainer |
| delete_project | Owner deletes after confirming name and expected version |
| list_projects | Public discovery or signed-in user's accessible projects, with keyset pagination |
| get_project_team | Authorized roster, including the authoritative owner and existing profile fields |

`set_project_member` is an owner-controlled access operation. An invitation/acceptance UI can be added later; it should grant membership only after its intended acceptance policy is met. There is no public self-join operation in this foundation.

Expected-version operations return SQLSTATE 40001 for a stale edit. The interface must reload/reconcile before retrying rather than overwrite another person's changes. Every creation starts as a draft, even when the chosen visibility is public.

`lib/projects/types.ts` defines the shared types, stages, and roles. `lib/projects/server.ts` provides server-only read/create/save adapters using the current Supabase session and safe error messages. Authenticated RPCs also support future lifecycle/team screens without requiring a service-role key in the browser.

## Verification performed

Isolated PostgreSQL checks covered migration reruns, real anon/authenticated roles, anonymous write denial, owner spoofing, fabricated audit denial, draft privacy, role permissions, public discovery, private access, removal, stale saves, immutable URLs, archived edits, ownership transfer, profile deletion behavior, typed deletion confirmation, permanent slug reservations, and all six setup checks. Additional checks recreated the exact supplied four-column legacy schema with two records and tested preservation, long titles, null descriptions, new writes against the retained title constraint, private pending imports, protected assignment, reruns, and all six setup checks. The isolated test did not access live Supabase data.

## Account interface

- `/projects` lists published public projects; `?view=mine` requires sign-in and lists accessible account projects. Lists use cursor pagination. Search filters the loaded collection and explicitly indicates when more records can be loaded.
- `/projects/new` saves a private account draft by default. A public visibility preference still requires a separate Publish action. Creation retries use an operation-specific URL to recover a saved draft after a lost response.
- `/projects/new?draft=<id>` opens an existing account-scoped browser copy. Saving imports it without deleting its original. Repeated imports reopen the same account project.
- `/projects/<slug>` loads through row-level security and shows the overview, technologies, team, and publication state. Unavailable and inaccessible projects share a generic not-found response.
- `/projects/<slug>/edit` permits owners and maintainers. Only owners can change visibility or publish/unpublish. Version conflicts retain the form contents and require reloading before another save. Archived projects are read-only.
- Server actions validate inputs and authentication before calling the database functions. No service-role credential is used.

The production build and input validation checks passed. The local public discovery page rendered its empty state without a storage error. An authenticated live create/edit/publish walkthrough remains to be completed with a signed-in account. Team management, GitHub synchronization, archive/delete controls, and activity views are later steps.
