# Project GitHub connection

## Implemented behavior

One repository per project. Only the current project owner can connect, replace, refresh, or disconnect a repository on an active project. Connecting requires both the signed-in Devvrats identity and GitHub App authorization. The repository must be accessible to that user through this App installation and the user must have push/admin permission. Knowing an installation ID is not sufficient.

The project page renders a purple daily graph, stars, and forks. Public responses contain no repository name, commit messages, authors, SHAs, file paths, or tokens. Private repositories require explicit project membership. Owners and members can request the ten latest default-branch commit titles in a separate control; that action rechecks authentication, project readability, and membership before fetching from GitHub. Feed/Clan membership does not yet grant project membership automatically.

Activity uses GitHub's last-year repository statistics, aligned Sunday–Saturday and shown in UTC. GitHub statistics exclude merge commits and may return 202 while being computed. The UI shows a pending state and retries through reconciliation or owner refresh. An empty repository may have no graph yet. Stars/forks are stored snapshots, not optimistic increments.

## 1. Supabase

Run the entire `supabase/migrations/20261017_project_github.sql` after the existing Projects foundation. This creates the connection table and narrowly granted RPCs. The table itself is inaccessible to anonymous/authenticated clients. The read RPC enforces existing Projects RLS semantics plus repository privacy. Server-only writes require a Supabase service-role key. Keep that key out of every NEXT_PUBLIC variable.

No existing Projects, profiles, Feed, or Clan records are modified by this migration.

## 2. Register a GitHub App

GitHub Settings → Developer settings → GitHub Apps → New GitHub App.

Use your actual deployment host below (for Sabha production, `https://sabha.devvrats.in`):

- Homepage URL: your Projects page.
- Callback URL: `https://sabha.devvrats.in/api/github/callback`.
- Webhook URL: `https://sabha.devvrats.in/api/github/webhook`.
- Webhook active: enabled; set a new random webhook secret privately.
- Repository permissions: Metadata read-only, Contents read-only. No write permissions required.
- Subscribe to Push, Repository, Star, and Fork events. Installation and installation-repository events are also handled.
- Leave “Request user authorization (OAuth) during installation” unchecked; Projects initiates its own account-bound authorization flow.
- Enable installation on the accounts that will use Projects.
- Generate a private key; create a client secret. The App ID, client ID, and App slug are also needed.
- Keep user access token expiration enabled. The app uses the short-lived user token only during repository selection and stores no refresh token.

Install the App using selected repositories. The Devvrats owner then chooses Connect GitHub on the project, authorizes the App, and selects a repository. If no installation exists yet, the picker offers Install GitHub App and Authorize again. Installation alone does not attach a repository to a project.

For localhost, register a separate development GitHub App with `http://localhost:3000/api/github/callback`. GitHub cannot deliver webhooks to localhost; use a development HTTPS tunnel if testing deliveries. Set the development App origin consistently with the callback host.

## 3. Server environment

Add these privately in `.env.local` for development and Vercel Production environment settings for production, then redeploy:

```
GITHUB_APP_ID=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_SLUG=
GITHUB_APP_ORIGIN=https://sabha.devvrats.in
GITHUB_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

`GITHUB_APP_PRIVATE_KEY` accepts the full PEM with real newlines or escaped `\n`. `GITHUB_APP_ORIGIN` is a trusted canonical origin configured by the operator; callback redirects do not trust request Host headers. Keep these values server-only. Existing public Supabase URL and publishable key remain in use for user authentication.

OAuth uses PKCE (S256). State is random, account/project-bound, expires after ten minutes, and is stored with the temporary user token in an authenticated encrypted HttpOnly, host-only cookie. Repository choices are verified again server-side during connection. Installation tokens are generated only server-side and restricted to the one repository with read permissions.

## 4. Schedule reconciliation

Configure a scheduler to request `GET https://sabha.devvrats.in/api/github/reconcile` every five minutes with `Authorization: Bearer <CRON_SECRET>`. Configure the header privately; never put it in a URL. Vercel Cron can call this path when the plan supports the desired frequency; its CRON_SECRET authorization is checked by the handler. No cron configuration has been added automatically because hosting plans have different schedule limits.

Each invocation processes up to four oldest/pending snapshots concurrently. Increase scheduler capacity/batch size before exceeding its backlog capacity. The route has a 60-second duration budget; GitHub requests time out after 15 seconds. Per-connection database leases prevent concurrent refreshes and enforce a one-minute minimum retry interval. A failed sync marks the connection unavailable and hides its public graph. Pending GitHub statistics are retried by the scheduler.

Signed webhook events immediately hide the public snapshot and invalidate in-flight refreshes before scheduling a refresh. Installation removal/suspension, repository removal/deletion, permission loss, and private visibility stop public display. Duplicate deliveries recalculate snapshots rather than increment counts. The scheduler is required to recover missed deliveries/background failures. Public data expires after two hours without a successful refresh; private visibility changes can have a bounded stale window if GitHub does not deliver its event. Public responses never include commit details even during that window.

## 5. Acceptance walkthrough

After configuration and migration:

1. Sign in as an existing project owner; connect a selected repository.
2. Verify pending state becomes a purple graph and accurate stars/forks after GitHub statistics are ready.
3. Push to its default branch; verify only that project's repository graph changes. Push to an unrelated repository; its commits must not appear.
4. Open the public project signed out. Verify only aggregates appear; private repository aggregates are hidden.
5. As a project member, open Member commit details. As an unrelated signed-in user, invoking the same action must return no titles.
6. Disconnect/reconnect, change repository visibility, remove the App installation, and confirm public snapshots disappear.
7. Inspect GitHub App Recent deliveries for successful webhook responses and the scheduler for successful reconciliation.

No live GitHub authorization, repository writes, credential changes, or database migration were performed during implementation. TypeScript compilation passed. Live GitHub authorization, webhooks, and database permissions have not been exercised; the earlier production build predates this integration.

## Reference

- https://docs.github.com/en/rest/metrics/statistics
- https://docs.github.com/en/rest/apps/installations
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app

## Connection review hardening

Apply `supabase/migrations/20261019_github_connection_safety.sql` before deploying the revised connection flow. Existing connections are preserved. `supabase/setup/check-github-connection-safety.sql` provides read-only installation checks.

Changes:

- OAuth captures the current connection identity and rechecks project ownership at callback and save. A checked database function locks the project and rejects replacement if another tab changed its connection. Disconnect has the same stale-connection guard.
- GitHub cancellation/expiration returns to a useful project recovery page. The picker supports repository search and a review of branch, privacy, read-only access, and replacement effects. Private/team sharing and replacement require explicit confirmation in the interface.
- Members see the connected repository and branch. Public viewers receive aggregates only. Commit actions recheck project access, membership, and connection identity after GitHub requests finish, reducing exposure from access changes during the request.
- Webhook signatures are verified over raw bytes with a 25 MiB input limit. Payload shape and repository/installation/delivery IDs are validated. The delivery ID is recorded in the same transaction as snapshot invalidation. Duplicates do no repeated work; a storage failure rolls back the record so an operator can redeliver. The scheduler retains delivery IDs for seven days. GitHub does not automatically retry failed deliveries; use Recent deliveries to redeliver failed requests after recovery.
- Refresh distinguishes ready, pending, and throttled states rather than reporting success when no refresh ran. Empty statistics responses become an empty ready state. Repository metadata and weekly data receive runtime shape checks before storage. Failed connections are included in scheduled recovery.

### Free scheduler activation

Enable Supabase Cron (`pg_cron`) and `pg_net`. In Supabase Vault, create `sabha_github_cron_secret` containing the exact production Vercel `CRON_SECRET` (at least 32 random characters). Never paste that value into chat. Then run `supabase/setup/schedule-github-reconciliation.sql`. It updates one named five-minute job and reads the authorization value from Vault at runtime. Its output contains only a job ID. Verify the HTTP response in addition to Cron History: a successful cron execution alone only confirms that pg_net queued the request.

This remains a pilot-size worker: each call processes four connections and public snapshots expire after two hours without successful refresh. Monitor backlog and refresh age as repository count increases. No guarantee of immediate visibility revocation is possible if a webhook is missed; public snapshots have the documented maximum stale window. No repository content or commit messages are stored in the delivery table.

### Verification performed

Production build, TypeScript, and focused ESLint passed. An isolated PGlite database with minimal identity/project fixtures exercised migration reruns, current-owner enforcement, stale replacement/disconnection, client table denial, draft/private/public summary rules, duplicate delivery handling, atomic retry after simulated storage failure, snapshot invalidation, and owner disconnect. This did not use live Supabase data or GitHub credentials and does not replace real account/installation/webhook verification. No production migration, secret change, repository mutation, or deployment was performed.

## Anu development context permissions

In GitHub: Settings → Developer settings → GitHub Apps → Devvrats Projects → Permissions & events → Repository permissions. Set **Issues: Read-only** and **Pull requests: Read-only**, then save. Existing installations must approve the requested permission update (GitHub installation settings → Configure/Review request → Accept new permissions). Keep existing Contents read-only and Metadata read-only. No write access, extra webhook events, new keys, or SQL migrations are required for this read-on-demand feature.

Anu requests a separate repository-restricted token for these permissions. If permission approval is missing, code reading and commit access continue with the existing contents token; Anu reports discussions as unavailable. Comments may contain sensitive data; common credential patterns are redacted, but detection is best effort. Existing project owner/team checks and connection rechecks apply before any development context is passed to Anu.

## Sync health and recovery

Apply `supabase/migrations/20261022_github_sync_health.sql`, then `supabase/setup/check-github-sync-health.sql`. Owners and project members see syncing, preparing, failed, stale (older than 30 minutes) and ready states with UTC last-success/attempt times. Status refreshes every 30 seconds only while visible and on focus. Successful background completion refreshes the graph. Public viewers retain the existing conservative aggregate visibility rules; diagnostic data is never exposed to them.

The health migration stores authored error codes only and makes finish-sync reject stale leases instead of silently reporting completion. Failure recording falls back to the previous schema while rolling out. A failed/pending sync is no longer prevented from retrying solely by a recent prior success; the database's existing lease and one-minute retry limit still apply. GitHub network work is bounded to 40 seconds. Webhooks process one concurrent batch of four immediately, leaving remaining invalidated rows for reconciliation. Reconciliation reports ready/pending/deferred/failed counts and returns 503 when every attempted sync fails.

Scheduled execution is not enabled by code alone. Use the existing schedule-github-reconciliation.sql operator setup, with the existing CRON_SECRET stored in Vault. Verify the named cron job is active and that its actual HTTP responses succeed; successful queueing alone is not proof. No secrets should be pasted into chat. This increment has not been built, tested, remotely applied or deployed.
