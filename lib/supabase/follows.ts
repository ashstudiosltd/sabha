import { createClient } from "@/lib/supabase/client";

export interface FollowState {
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export interface ProfileFollower {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Get the follow state between the current user
 * and another profile.
 */
export async function getFollowState(
  profileId: string
): Promise<FollowState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: followersCount, error: followersError } =
    await supabase
      .from("profile_follows")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("following_id", profileId);

  if (followersError) {
    console.error(
      "Error fetching followers count:",
      followersError
    );
  }

  const { count: followingCount, error: followingError } =
    await supabase
      .from("profile_follows")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("follower_id", profileId);

  if (followingError) {
    console.error(
      "Error fetching following count:",
      followingError
    );
  }

  if (!user) {
    return {
      following: false,
      followersCount: followersCount ?? 0,
      followingCount: followingCount ?? 0,
    };
  }

  const { data: existingFollow, error: followError } =
    await supabase
      .from("profile_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profileId)
      .maybeSingle();

  if (followError) {
    console.error(
      "Error checking follow state:",
      followError
    );
  }

  return {
    following: !!existingFollow,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

/**
 * Follow or unfollow a profile.
 */
export async function toggleFollow(
  profileId: string
): Promise<{
  following: boolean;
  followersCount: number;
  error: string | null;
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      following: false,
      followersCount: 0,
      error: "You need to be signed in to follow profiles.",
    };
  }

  if (user.id === profileId) {
    return {
      following: false,
      followersCount: 0,
      error: "You cannot follow yourself.",
    };
  }

  const { data: existingFollow, error: existingError } =
    await supabase
      .from("profile_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profileId)
      .maybeSingle();

  if (existingError) {
    console.error(
      "Error checking existing follow:",
      existingError
    );

    return {
      following: false,
      followersCount: 0,
      error: existingError.message,
    };
  }

  if (existingFollow) {
    const { error: deleteError } = await supabase
      .from("profile_follows")
      .delete()
      .eq("id", existingFollow.id)
      .eq("follower_id", user.id);

    if (deleteError) {
      console.error(
        "Error removing follow:",
        deleteError
      );

      return {
        following: true,
        followersCount: 0,
        error: deleteError.message,
      };
    }
  } else {
    const { error: insertError } = await supabase
      .from("profile_follows")
      .insert({
        follower_id: user.id,
        following_id: profileId,
      });

    if (insertError) {
      console.error(
        "Error creating follow:",
        insertError
      );

      return {
        following: false,
        followersCount: 0,
        error: insertError.message,
      };
    }
  }

  const { count, error: countError } = await supabase
    .from("profile_follows")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("following_id", profileId);

  if (countError) {
    console.error(
      "Error refreshing followers count:",
      countError
    );
  }

  return {
    following: !existingFollow,
    followersCount: count ?? 0,
    error: null,
  };
}

/**
 * Get the people following a profile.
 */
export async function getFollowers(
  profileId: string
): Promise<ProfileFollower[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profile_follows")
    .select(`
      follower_id,
      profiles!profile_follows_follower_id_fkey (
        id,
        username,
        name,
        avatar_url
      )
    `)
    .eq("following_id", profileId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error fetching followers:",
      error
    );

    return [];
  }

  return (data ?? []).map((item) => {
    const profile = Array.isArray(item.profiles)
      ? item.profiles[0]
      : item.profiles;

    return {
      id: profile?.id ?? item.follower_id,
      username: profile?.username ?? "user",
      name: profile?.name ?? "Unknown User",
      avatarUrl: profile?.avatar_url ?? null,
    };
  });
}

/**
 * Get the people a profile is following.
 */
export async function getFollowing(
  profileId: string
): Promise<ProfileFollower[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profile_follows")
    .select(`
      following_id,
      profiles!profile_follows_following_id_fkey (
        id,
        username,
        name,
        avatar_url
      )
    `)
    .eq("follower_id", profileId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error fetching following:",
      error
    );

    return [];
  }

  return (data ?? []).map((item) => {
    const profile = Array.isArray(item.profiles)
      ? item.profiles[0]
      : item.profiles;

    return {
      id: profile?.id ?? item.following_id,
      username: profile?.username ?? "user",
      name: profile?.name ?? "Unknown User",
      avatarUrl: profile?.avatar_url ?? null,
    };
  });
}