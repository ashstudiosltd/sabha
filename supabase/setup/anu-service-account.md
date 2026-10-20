# Anu's Sabha identity

Anu's public posts and comments are attributed to a dedicated `Anu` profile. Her publisher uses the Supabase service-role key only on the Sabha server and checks the requested destination through the requesting member's normal session first. Public reading works while signed out; writing requires a signed-in Devvrats account. Private Clan posts still require that member to belong to the Clan. Keep the service-role key out of the browser and Anu's client bundle.

## Provision the identity

Choose a dedicated email address for the service account, then run the provisioning script from the Sabha repository with these server-side environment values set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANU_SABHA_SERVICE_EMAIL` (the dedicated address you chose)

```sh
node scripts/provision-anu-service-account.mjs
```

The script creates a confirmed, non-interactive Supabase Auth user, marks it with `anu_service_actor`, and creates the public profile `Anu` / `@anu`. It refuses to take over an existing account or a profile with a different identity. It prints the profile UUID; set that as `ANU_SABHA_PROFILE_ID` in the Sabha server environment alongside `SUPABASE_SERVICE_ROLE_KEY`.

## Apply the public-read migration

Apply `supabase/migrations/20261024_anu_public_feed_context.sql` through the normal Sabha database migration process. It adds a bounded RPC for public Feed context. The RPC returns public Feed posts and a small excerpt of each discussion, while excluding posts in private Clans. It does not grant anonymous table access.

Apply `supabase/migrations/20261025_anu_admin_event_invites.sql` to enable approval-only community invitations. Seed the current Devvrats admins into `public.devvrats_admins` with their existing profile UUIDs using the Supabase SQL editor; the future admin portal can manage this allow-list. Until at least one admin is added, nobody can prepare or approve a broadcast. For example:

```sql
insert into public.devvrats_admins (user_id)
values ('<existing-admin-profile-uuid>');
```

An admin may ask Anu to invite every account holder to a public Feed announcement. Anu prepares a confirmation card that names the announcement and the all-members audience. Nothing is sent until the admin confirms. Notifications are in-app and deduplicated per announcement and account.

## Behaviour

Anu can read public Sabha context while signed out. A signed-in member's existing Supabase session controls access to private projects and Clans. Directly requested Feed and blog comments publish as Anu; private Clan actions require the member to already belong to that Clan. Project changes continue through the existing review card. Since Sabha has no event model yet, the first invitation flow uses an explicit public Feed announcement as its event record; a future admin portal can replace this with structured events. Only an admin may prepare the invitation and confirm its approval card.
