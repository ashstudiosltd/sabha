# Find useful work

Apply `supabase/migrations/20261021_project_contributions.sql` to enable persistent team guidance. It creates a separate guidance table with project RLS visibility and owner/maintainer-only writes on active projects. Existing project records, GitHub connections and profiles are unchanged. Saves use a version comparison to reject stale updates. Guidance is plain text; no command is executed.

The project Overview now contains Find useful work, including team-written help areas, setup steps and contribution expectations. Owners and maintainers can edit; archived projects are read-only. Without the migration, project browsing continues and the editor explains setup is required.

Open GitHub issues are fetched on demand and manually refreshable. Owners/team can read connected private repository issues. Outsiders/guests require a public, published, active project and a repository GitHub confirms is public. Missing repository/permission/network states are distinct from a successful empty result. An access/connection recheck occurs after retrieval.

At most 50 recently updated issue-list records are considered (GitHub includes pull requests in that list); PRs are excluded and up to 12 issues displayed. Sorting prioritizes repository labels good first issue, help wanted and no listed assignee, then update time. These are transparent signals, not verified difficulty, open availability, a reservation, or an assignment. Filters operate on fetched results. GitHub remains the place to discuss and claim an issue. No issues, comments or memberships are created automatically.

No remote SQL, builds, tests or deployment were performed for this increment. Validate public/private/member/guest views and the migration before release.
