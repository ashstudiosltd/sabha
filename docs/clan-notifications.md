# Clan notifications

Apply `supabase/migrations/20261015_clan_activity_notifications.sql` in the Sabha Supabase SQL editor after all existing Clan migrations, including `20261014_clan_owner_controls.sql`. The new migration is transactional and can be rerun. It does not send historical notifications or change public Clans to approval-based membership.

## Events and recipients

| Event | Who receives an update |
| --- | --- |
| New Clan post | Current members except the author |
| Reply or comment | Post author and existing thread participants with access, except the actor |
| Like | Post author with access; unliking removes the update |
| Invitation | Invitee, through the existing invitation workflow |
| Invitation accepted or declined | Inviter; an acceptance does not also send the inviter a duplicate join event |
| Invitation revoked | Invitee; the old acceptance link is invalidated |
| Private Clan join request | Current owner and admins |
| Request approved or declined | Requester |
| Member joined | Owner and admins, except the actor and an inviter already receiving acceptance |
| Member left or removed | Owner and admins; a removed member receives a separate access notice |
| Role changed | Affected member |
| Ownership transferred | Current members, except the person performing the transfer |
| Archived, restored, renamed, or visibility changed | Current members, except the actor |
| Clan deleted | Former members and pending invitees/requesters, except the actor, with a link to Clans instead of the deleted page |
| Post, reply, or comment removed by a moderator | Affected author, except self-deletion; obsolete previews are removed |

Blogs keep likes, comments, followed-author posts, and follows in the same notification stream. Blog likes/comments now include content context.

## Privacy and navigation

Private Clans remain absent from public discovery. A signed-in person with a known Clan link can see only the Clan name, image, archive state, and their own request status. Members and posts are not returned until membership is approved.

Leaving/removal clears that person's stored Clan content previews. Clan deletion replaces live activity with a deletion notice. Notifications are readable only by their recipient. Internal notification-emission helpers cannot be called by clients.

Notification links to Feed and Clan posts include the specific post ID. Pages fetch that post separately when it is older than the latest page. Existing share URLs continue to work.

The bell shows the latest activity, with All/Unread/Clans filters and older-page loading. `/notifications` uses the same component for the full activity list. Read updates are saved only after the database confirms them. Realtime updates are backed by focus/visibility refresh and a one-minute poll. While older pages are open, new updates offer a refresh button instead of replacing the reading position.

## Validation performed

The app production build and focused lint checks pass. An isolated PostgreSQL engine applied all prerequisite migrations and exercised requests, approval, invitation acceptance, new posts, replies, comments, likes/unlikes, moderator deletion, removal privacy cleanup, ownership transfer, archive restrictions, and Clan deletion. Role-based checks confirmed that a removed member cannot read private posts, another person's notifications, review requests, or fabricate notifications.

The migration has not been applied to the live Supabase project by this task. After applying it, use two signed-in accounts to check the bell updates and request approvals in the deployed app; hosted Realtime delivery is not covered by the isolated database check.
