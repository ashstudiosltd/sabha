# Shared Devvrats identity: Sabha migration plan

Decision: Main’s existing Supabase project is the central identity provider. Anu now consumes that verified session. Sabha currently uses a separate Supabase project, so its existing auth, profiles, storage and RLS cannot be switched by replacing environment variables alone.

## Preserve existing users and content

1. Inventory Sabha auth users, profiles, posts, comments, likes, storage ownership, foreign keys, RLS policies, triggers and provider configuration. Take database and storage backups before migration.
2. Use a staging copy to map Sabha legacy user IDs to Main identities. Require verified account ownership before linking; do not link identities using unverified metadata or display names. Resolve duplicate accounts explicitly. Maintain an audited legacy-to-central-ID mapping.
3. Prefer migrating Sabha’s application tables/storage and policies into Main’s Supabase project for a single native Supabase identity boundary. Inspect schema/name conflicts first. Update ownership foreign keys through the mapping, including references in storage and all RLS predicates. If databases must stay separate, design a server-mediated data-access layer or supported trusted token exchange; Main cookies alone cannot authorize against the existing Sabha project.
4. Reproduce and review public-blog visibility and member write permissions in staging. Main accounts must see only their own private data. Do not use a service-role key in a browser or relax RLS to make shared auth work.
5. Once staged data/permissions are ready, replace Sabha’s `/auth` entry with a redirect to Main `/registration?next=...`; validate all return URLs against explicit first-party origins. Keep an allowlisted legacy callback only as needed for in-flight sessions. Switch client/server Supabase configuration together and share `.devvrats.in` cookies over HTTPS.
6. Cut over with a rollback plan and reconciliation of content created during migration. Existing Sabha users may need one fresh central sign-in. Confirm profile ownership, posting, editing, comments/likes and sign-out propagation before removing the legacy login.

## Current status

No Sabha credentials, accounts, database records or RLS have been changed. The existing login now validates return destinations to keep them within Sabha, preserves the destination on retry, and redirects already signed-in visitors back to that destination. It continues using Sabha’s existing Supabase project. Blogs continues to use embedded Anu without redirecting to the standalone portal. Main and standalone Anu have been wired for shared auth; a real provider login still needs to be completed by a member after Supabase redirect settings are confirmed.
