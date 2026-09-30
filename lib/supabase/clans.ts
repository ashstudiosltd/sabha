import { createClient } from "@/lib/supabase/server";

export type Clan = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  visibility: "private" | "public";
  created_at: string;
  updated_at: string;
};

export type ClanMember = {
  id: string;
  clan_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
};

export async function getClanBySlug(
  slug: string
): Promise<Clan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_clan_by_slug_for_request", {
      target_slug: slug,
    })
    .maybeSingle<Clan>();

  if (error) {
    console.error(
      "Failed to fetch clan:",
      error
    );

    return null;
  }

  return data ?? null;
}

export async function getClanMembers(
  clanId: string
): Promise<ClanMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clan_members")
    .select(`
      id,
      clan_id,
      user_id,
      role,
      joined_at
    `)
    .eq("clan_id", clanId)
    .order("joined_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Failed to fetch clan members:",
      error
    );

    return [];
  }

  return data ?? [];
}

export async function getUserClans(
  userId: string
): Promise<Clan[]> {
  const supabase = await createClient();

  const { data: memberships, error } =
    await supabase
      .from("clan_members")
      .select("clan_id")
      .eq("user_id", userId);

  if (error) {
    console.error(
      "Failed to fetch clan memberships:",
      error
    );

    return [];
  }

  const clanIds =
    memberships?.map(
      (membership) => membership.clan_id
    ) ?? [];

  if (!clanIds.length) {
    return [];
  }

  const { data: clans, error: clansError } =
    await supabase
      .from("clans")
      .select(`
        id,
        owner_id,
        name,
        slug,
        description,
        avatar_url,
        banner_url,
        visibility,
        created_at,
        updated_at
      `)
      .in("id", clanIds)
      .order("created_at", {
        ascending: false,
      });

  if (clansError) {
    console.error(
      "Failed to fetch user clans:",
      clansError
    );

    return [];
  }

  return clans ?? [];
}

export type ClanJoinRequest = {
  id: string;
  clan_id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
};

export async function getClanJoinRequests(
  clanId: string
): Promise<ClanJoinRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clan_join_requests")
    .select(
      "id, clan_id, user_id, status, created_at, updated_at"
    )
    .eq("clan_id", clanId)
    .eq("status", "pending")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error fetching clan join requests:",
      error
    );

    return [];
  }

  return data ?? [];
}