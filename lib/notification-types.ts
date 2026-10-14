export type NotificationType =
  | "clan_invite" | "clan_join_request" | "clan_join_accepted" | "clan_join_declined" | "clan_invite_declined" | "clan_invite_revoked"
  | "clan_member_joined" | "clan_member_left" | "clan_member_removed" | "clan_role_changed" | "clan_ownership_changed"
  | "clan_archived" | "clan_restored" | "clan_deleted" | "clan_updated" | "clan_post_deleted" | "clan_content_removed"
  | "post_like" | "post_comment" | "new_blog_post" | "new_feed_post" | "new_clan_post" | "feed_like" | "feed_reply" | "feed_comment" | "follow";

export interface NotificationItem {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  entity_id: string | null;
  entity_type: string;
  target_path: string;
  read_at: string | null;
  created_at: string;
  clan_id?: string | null;
  context_label?: string | null;
  preview?: string | null;
  actor: { name: string | null; username: string | null; avatar_url: string | null } | null;
}
