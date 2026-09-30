import { createClient } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type:
    | "clan_invite"
    | "clan_join_request"
    | "clan_join_accepted"
    | "post_like"
    | "post_comment"
    | "follow";
  title: string;
  message: string | null;
  entity_id: string | null;
  entity_type: string | null;
  read_at: string | null;
  created_at: string;
  actor: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function getNotifications(
  userId: string,
  limit = 30
): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id,
      recipient_id,
      actor_id,
      type,
      title,
      message,
      entity_id,
      entity_type,
      read_at,
      created_at,
      actor:profiles!notifications_actor_id_fkey (
        id,
        username,
        name,
        avatar_url
      )
    `)
    .eq("recipient_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error(
      "Failed to fetch notifications:",
      error
    );

    return [];
  }

  return (data ?? []).map((notification) => ({
    id: notification.id,
    recipient_id: notification.recipient_id,
    actor_id: notification.actor_id,
    type: notification.type as Notification["type"],
    title: notification.title,
    message: notification.message,
    entity_id: notification.entity_id,
    entity_type: notification.entity_type,
    read_at: notification.read_at,
    created_at: notification.created_at,
    actor: Array.isArray(notification.actor)
      ? notification.actor[0] ?? null
      : notification.actor ?? null,
  }));
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    console.error(
      "Failed to fetch unread notification count:",
      error
    );

    return 0;
  }

  return count ?? 0;
}