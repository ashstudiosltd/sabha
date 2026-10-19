# Personal Anu: first integration

## Implemented contract

Authenticated same-origin POST `/api/anu/chat`:

```json
{"message":"Help me plan this project", "focus":{"kind":"project","id":"PROJECT_UUID"}}
```

Focus is optional and accepts project, blog, feed, clan, notification. IDs are permanent UUIDs, not slugs. Browser-supplied identity, context and history are not trusted or forwarded. Returns reply, source references `{id,kind,title,url}`, and focusUnavailable.

Sabha verifies the user with Supabase getUser, retrieves context using that session's RLS, and sends a bounded snapshot to Anu `/api/integrations/sabha/chat`. Neither user tokens nor service-role credentials are sent. The matching ANU_INTEGRATION_SECRET must exist on both applications, including local development. Existing ANU_API_URL on Sabha determines the Anu server; production defaults to https://anu.devvrats.in. Deploy both applications before connecting UI.

Sources are checked twice against the request's allowed source IDs. Links are constructed by Sabha, not supplied by the model. Only sources selected by the model are returned. Context, replies and notifications are never cached by these routes. Personal notifications explicitly filter recipient_id. Failed retrieval areas are reported to the model as unavailable, never interpreted as no activity.

## Deliberate limits

- Existing Blogs UI/public summaries are unchanged. This route is ready for a shared authenticated interface; it is not yet wired into that interface or the Anu standalone portal.
- Search covers the latest 40 accessible records per content area and 15 notifications, plus an optional focused record. It is not exhaustive semantic search. Source excerpts are limited to 6,000 characters each and six records per request.
- Requests use fresh context and no previous chat text. Persistent history and permission-aware memory are the next stage. Previously generated private answers must not be blindly replayed after permissions change.
- No GitHub file ingestion, sheet provider, write tools, proactive suggestions, or durable memories yet. No schema changes needed for this foundation.
- Limits in memory are per running process, not distributed quotas. Add shared quotas before broad public rollout.
- Access is checked at retrieval time. Already displayed information cannot be withdrawn; requests already in flight may complete during a permission change.
- Private excerpts are sent to the configured Gemini service through Anu. Provider data handling must be considered before enabling private retrieval in the product interface.

## Next implementation

Connect the shared contextual UI with focus IDs; add recipient-owned history storage and RLS; implement history retrieval that excludes inaccessible source material; add account-owned memory management; then repository technology context using existing project/GitHub membership checks. Keep public blog previews on their restricted path.

## Verification

No live requests, database changes, build or test commands were run for this implementation. Review in local development before deployment.

## Shared interface and history (second increment)

The existing Blogs orb is reused on Feed, Clan pages, and Projects. Signed-in Blogs chat now uses the personal endpoint; public summaries and anonymous Blogs chat retain their restricted paths. A focused Project/Clan is resolved under browser RLS; the server rechecks the permanent ID. Projects uses dark companion styling. Creation/settings/auth pages do not display the added companion.

Apply `supabase/migrations/20261020_anu_history.sql` in Sabha's Supabase SQL Editor. It creates account-owned turns with select/insert/delete RLS and no anonymous grants. Conversation scopes separate each project or clan from general Blogs/Feed/Projects chats. The latest 20 turns are restored and can be cleared with the trash action. History failures do not prevent a reply; the interface reports unsaved replies. Signed-in history is not stored in sessionStorage. No user-facing consent prompt added.

Before restoring an answer, all context source IDs are batch-checked under current RLS. Answers involving an unavailable source are omitted. Up to four recent turns are replayed only when all their source IDs occur in the freshly retrieved context, with a 12,000-character budget. This deliberately limited recall may omit previous turns when the topic or source selection changes. Long-term preference memory is not implemented. The standalone Anu portal history is not connected to this table yet.

No migration has been executed remotely and no deployment, build, or tests were run in this increment.

## Repository understanding

Focused project chats retrieve the current connected repository only for the owner or explicit project_members. A repository-scoped installation token reads the default branch commit, its recursive tree, and up to five relevant source/manifests/README excerpts pinned to that commit. Each excerpt is at most 2,000 characters; the map lists up to 40 eligible paths. Truncated trees and excerpts are marked. Prior repository-backed turns are not replayed as current code evidence. Access and the connection identity are checked again after retrieval. The interface accepts canonical GitHub references pinned to the commit.

Files over 100 KB, common credential paths, binaries and generated directories are excluded. Obvious credential patterns are redacted, but detection is not complete. Repository contents never enter a cross-user cache. No issues/PR ingestion or full indexing is implemented. Ask focused questions from an individual project's page; a general discovery question does not scan every connected repository. Deploy both applications for the extended context contract. No additional SQL needed for repository reading.

## Code understanding (third increment)

Question terms now rank entry files, with auth/login/session and API/data-flow expansions. The reader follows up to two rounds of JS/TS import and static fetch relationships within a ten-file limit. Relative imports and plain-JSON tsconfig wildcard paths are resolved against the actual eligible tree. External packages, unsupported configuration and dynamic endpoints are not guessed. Other languages can supply excerpts but do not have semantic import resolution yet.

The payload contains observed edges, unresolved imports, failed reads, and original line-numbered excerpts chosen around question terms. The answer instruction separates observed authentication from authorization and asks for entry point → components/handlers → data → access checks → output. Commit-pinned file references are exposed when the repository source is used, with a maximum of six displayed references per turn. They identify inspected files, not a verified citation for every sentence. The request remains bounded to 23,000 repository-context characters and an eight-second GitHub network budget. No new SQL or GitHub App permissions are required. No build or tests run for this increment.

## Development context

The focused repository snapshot now includes up to ten recent reachable commits and bounded recent issue/PR discussion records. Retrieval runs alongside code reads under the same eight-second network budget. GitHub App Issues and Pull requests read-only permissions require installation approval; missing access is explicitly represented rather than treated as no issues. Recent issue-list records include PRs and may yield fewer actual issues. Up to three issues and three PRs are ranked by question relevance and update time, with first five conversation comments each; inline review threads, CI checks, deployment status and review decisions remain outside scope. Context size may further reduce returned records. References can link to GitHub commits, issues, or PRs. Existing history rules do not replay repository-backed turns as current facts.

Deploy Sabha and Anu together. No SQL needed. No build, tests, or live GitHub calls were run for this increment.

## Expanded reading and reviewed actions

Anu now searches accessible records across all dates using bounded keyword filtering, rather than searching only the newest 40 records. Broad questions return a cross-area overview. It adds bounded comments/replies, Clan membership/posts, project teams and contribution guides; failures remain explicit. Repository reads still use the existing installation/membership rules. This is a bounded reader, not an exhaustive index or unrestricted database agent.

Supported reviewed actions: Feed posts (including joined Clans), Feed replies/comments, Blog comments, new project drafts, and project edits. The model may only propose typed drafts. Destination IDs must be present in authorized context. Sabha validates the draft, signs it for the current member and a ten-minute window, and returns an editable review card. The member must click Confirm; retrieved text cannot execute writes. Execution rechecks the session, parent visibility, Clan membership, and project management/version rules under RLS. Create operations use stable IDs/slugs for retry safety. Project descriptions are derived from the displayed draft body, so hidden description text cannot differ from the review. No deletion, membership changes, moderation, invitations, GitHub writes, or arbitrary SQL is exposed.

The standalone Anu DEVVRATS space reaches these endpoints through its server bridge. Requests require both the shared server secret and the member's existing Supabase session, with an expected-member ID check. The secret alone cannot act as a member. No permissive CORS or service-role access is introduced. Portal conversation lists, search, and reopening recheck source visibility. Private portal messages are kept out of browser sessionStorage.

Apply `20261020_anu_history.sql` if missing, then `20261022_anu_bounded_history.sql` and `supabase/setup/anu-history-retention.sql` with Supabase Cron enabled. The retention trigger limits 20 turns per scope and 20 portal scopes per account; the daily job deletes turns older than 45 days. It does not share standalone ANU transcripts or store permanent preferences.

Checks: `node scripts/check-anu-actions.mjs`, TypeScript, builds in both repos, and focused lint on changed files. The repository-wide lint command has existing errors outside this feature, including legacy effects and an unescaped apostrophe. Do not report that full lint as passing. A real authenticated device walkthrough is still required to validate provider login, model choices, and the confirmation UI; no test messages should be published to a community without an explicit request.
## Shared Anu profile

The account-owned `anu_member_preferences` table stores a member's voluntary short memory note, reply style, and light/dark/system theme. It is protected by RLS so each authenticated member can read and update only their own row. The Anu web app reads and writes it with the same shared Devvrats Supabase identity. Sabha's Anu route adds the note and style to its request context so replies in DEVVRATS and ANU use the same preferences. These notes are user-provided context, not verified facts, and are included in the Gemini request. The profile screen advises against adding secrets. The theme is persisted through the same row so it can be restored on another device.
