# Shared project attachments — v1 foundation

Project identity is `ProjectReference {kind:"project",id:UUID}`. Feed's existing reference slot stores `/projects/UUID` with kind `project` and a generic `Project` label, not a copied private name or summary. No new table or migration is needed for the one-attachment Feed model. Future multi-attachment relationships should use normalized project IDs with explicit discussion/contribution relationships rather than inferring membership from a post.

The composer offers a searchable project picker of permitted published, unarchived projects. Private attachments do not grant project access. Current names, tagline, technologies, stage, archive state and visibility are resolved through the requesting viewer's Supabase RLS in bounded batches. Unavailable and inaccessible projects share a neutral placeholder. Previews are private/no-store and refresh after authentication changes; no shared browser cache. Legacy canonical project slug links are supported at read time. UUID project routes resolve through RLS and survive slug changes.

Feed and Clan cards share one adaptive attachment renderer. Individual Feed share pages use that same renderer, including public visitors. Existing Feed Open Graph metadata is not enriched with live project details; new references store only a generic label. Project Open Graph, Blog embeds, profile/DID contributions and richer attachment relationships remain subsequent increments.

No database mutations, remote deployment, builds or tests were run for this increment. Validate authenticated/public/private reference journeys before rollout.

## Blog, profile and public sharing increment

Blog creation offers the same project picker. A project embed is stored as an exact standalone `[[project:UUID]]` paragraph in the existing content array; it carries no project name, access grant, or copied private content. Both Blog detail modal and standalone Blog page render this typed marker as the shared attachment. Ordinary paragraphs remain text. Existing plain-text consumers may show the marker until adapted; it is not interpreted as arbitrary HTML or a fetch URL.

Profiles have a Projects tab with published owned/member projects, resolved through the viewer's RLS. Roles come only from existing ownership and membership records, not inferred post references. Results are bounded to 50 owned and 50 joined projects, with up to 100 membership records considered; profile search filters these fetched names.

Project pages have the existing ShareSheet and stable UUID URLs. Private/draft/archived sharing uses a generic title, and sharing never grants access. Page metadata and Open Graph images use a separate anonymous Supabase client with explicit public/published/unarchived filters. Unavailable projects receive generic imagery and noindex metadata; no private project name or description enters that lookup. No new SQL or GitHub permissions needed.

This increment was not built, tested, or deployed. Verify both authorized and anonymous rendering before release.
