import { createClient } from "@/lib/supabase/client";

export interface PublicProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;

  bio: string | null;
  website: string | null;

  location: string | null;
  locationPublic: boolean;

  skills: string | null;
  interests: string | null;
  role: string | null;
  status: string | null;

  joinedAt: string;

  postsCount: number;
  likesReceived: number;
  followersCount: number;
  followingCount: number;
}

export async function getPublicProfile(
  username: string
): Promise<PublicProfile | null> {
  const supabase = createClient();

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(`
  id,
  username,
  name,
  avatar_url,
  bio,
  website,
  location,
  location_public,
  skills,
  interests,
  role,
  status,
  joined_at
`)
      .eq("username", username)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Error fetching public profile:",
      profileError
    );

    return null;
  }

  if (!profile) {
    return null;
  }

  const { count: postsCount, error: postsError } =
    await supabase
      .from("posts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("author_id", profile.id);

  if (postsError) {
    console.error(
      "Error fetching profile post count:",
      postsError
    );
  }

  const { data: userPosts, error: userPostsError } =
    await supabase
      .from("posts")
      .select("id")
      .eq("author_id", profile.id);

  if (userPostsError) {
    console.error(
      "Error fetching profile posts:",
      userPostsError
    );
  }

  let likesReceived = 0;

  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map(
      (post) => post.id
    );

    const {
      count: likesCount,
      error: likesError,
    } = await supabase
      .from("post_likes")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("post_id", postIds);

    if (likesError) {
      console.error(
        "Error fetching profile likes:",
        likesError
      );
    } else {
      likesReceived = likesCount ?? 0;
    }
  }

  const {
    count: followersCount,
    error: followersError,
  } = await supabase
    .from("profile_follows")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("following_id", profile.id);

  if (followersError) {
    console.error(
      "Error fetching followers count:",
      followersError
    );
  }

  const {
    count: followingCount,
    error: followingError,
  } = await supabase
    .from("profile_follows")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("follower_id", profile.id);

  if (followingError) {
    console.error(
      "Error fetching following count:",
      followingError
    );
  }

 return {
  id: profile.id,
  username: profile.username,
  name: profile.name,
  avatarUrl: profile.avatar_url,

  bio: profile.bio,
  website: profile.website,

  location: profile.location,
  locationPublic: profile.location_public,

  skills: profile.skills,
  interests: profile.interests,
  role: profile.role,
  status: profile.status,

  joinedAt: profile.joined_at,

  postsCount: postsCount ?? 0,
  likesReceived,
  followersCount: followersCount ?? 0,
  followingCount: followingCount ?? 0,
};
}

/*
 * ============================================================
 * UPDATE PROFILE
 * ============================================================
 */

export interface UpdateProfileInput {
  name: string;
  username: string;
  bio: string;
  website: string;
  location: string;
  locationPublic: boolean;
  skills: string;
  interests: string;
  role: string;
  status: string;
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<{
  error: string | null;
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error:
        "You need to be signed in to update your profile.",
    };
  }

  const name = input.name.trim();

  const username = input.username
    .trim()
    .toLowerCase();

  const bio = input.bio.trim();
  const website = input.website.trim();
  const location = input.location.trim();
  const skills = input.skills.trim();
  const interests = input.interests.trim();
  const role = input.role.trim();
  const status = input.status.trim();

  if (name.length < 2) {
    return {
      error:
        "Name must be at least 2 characters.",
    };
  }

  if (name.length > 80) {
    return {
      error:
        "Name must be 80 characters or less.",
    };
  }

  if (!username) {
    return {
      error: "Username is required.",
    };
  }

  if (username.length < 3) {
    return {
      error:
        "Username must be at least 3 characters.",
    };
  }

  if (username.length > 30) {
    return {
      error:
        "Username must be 30 characters or less.",
    };
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return {
      error:
        "Username can only contain lowercase letters, numbers, and underscores.",
    };
  }

  if (bio.length > 500) {
    return {
      error:
        "Bio must be 500 characters or less.",
    };
  }

  if (website.length > 200) {
    return {
      error:
        "Website must be 200 characters or less.",
    };
  }

  if (location.length > 100) {
    return {
      error:
        "Location must be 100 characters or less.",
    };
  }

  if (skills.length > 500) {
    return {
      error:
        "Skills must be 500 characters or less.",
    };
  }

  if (interests.length > 500) {
    return {
      error:
        "Interests must be 500 characters or less.",
    };
  }

  if (role.length > 100) {
    return {
      error:
        "Role must be 100 characters or less.",
    };
  }

  if (status.length > 100) {
    return {
      error:
        "Status must be 100 characters or less.",
    };
  }

  const {
    data: existingProfile,
    error: usernameError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (usernameError) {
    console.error(
      "Error checking username:",
      usernameError
    );

    return {
      error:
        "Unable to check username availability.",
    };
  }

  if (existingProfile) {
    return {
      error:
        "That username is already taken.",
    };
  }

  const { error: updateError } =
    await supabase
      .from("profiles")
      .update({
        name,
        username,

        bio: bio || null,
        website: website || null,

        location: location || null,
        location_public:
          input.locationPublic,

        skills: skills || null,
        interests: interests || null,

        role: role || null,
        status: status || null,
      })
      .eq("id", user.id);

  if (updateError) {
    console.error(
      "Error updating profile:",
      updateError
    );

    if (updateError.code === "23505") {
      return {
        error:
          "That username is already taken.",
      };
    }

    return {
      error: updateError.message,
    };
  }

  return {
    error: null,
  };
}

/*
 * ============================================================
 * CURRENT PROFILE AVATAR
 * ============================================================
 */

export interface ProfileAvatar {
  avatarUrl: string | null;
  providerAvatarUrl: string | null;
}

export async function getCurrentProfileAvatar(): Promise<ProfileAvatar | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      avatar_url,
      provider_avatar_url
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Error fetching profile avatar:",
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return {
    avatarUrl: data.avatar_url,
    providerAvatarUrl:
      data.provider_avatar_url,
  };
}

/*
 * ============================================================
 * UPLOAD CUSTOM AVATAR
 * ============================================================
 */

export async function uploadProfileAvatar(
  file: File
): Promise<{
  avatarUrl: string | null;
  error: string | null;
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      avatarUrl: null,
      error:
        "You need to be signed in to change your profile picture.",
    };
  }

  /*
   * Basic file validation.
   */

  if (!file.type.startsWith("image/")) {
    return {
      avatarUrl: null,
      error:
        "Please select an image file.",
    };
  }

  /*
   * Keep profile images reasonably small.
   */
  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    return {
      avatarUrl: null,
      error:
        "Profile pictures must be 5 MB or smaller.",
    };
  }

  /*
   * Use the user's ID as the folder.
   *
   * Example:
   *
   * user-id/avatar.jpg
   */
  const extension =
    file.name.split(".").pop()?.toLowerCase() ||
    "jpg";

  const filePath = `${user.id}/avatar.${extension}`;

  /*
   * Upload / replace the user's avatar.
   */
  const { error: uploadError } =
    await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

  if (uploadError) {
    console.error(
      "Error uploading avatar:",
      uploadError
    );

    return {
      avatarUrl: null,
      error: uploadError.message,
    };
  }

  /*
   * Get the public URL.
   */
  const {
    data: { publicUrl },
  } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  /*
   * Add a cache-busting parameter.
   *
   * This prevents the browser from showing
   * the previous cached avatar after replacement.
   */
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  /*
   * Save the custom avatar as the active
   * profile picture.
   */
  const { error: updateError } =
    await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

  if (updateError) {
    console.error(
      "Error saving avatar URL:",
      updateError
    );

    return {
      avatarUrl: null,
      error: updateError.message,
    };
  }

  return {
    avatarUrl,
    error: null,
  };
}

/*
 * ============================================================
 * REMOVE CUSTOM AVATAR
 * ============================================================
 *
 * Restores the original Google/GitHub picture.
 */

export async function removeCustomProfileAvatar(): Promise<{
  avatarUrl: string | null;
  error: string | null;
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      avatarUrl: null,
      error:
        "You need to be signed in.",
    };
  }

  /*
   * Get the provider avatar.
   */
  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(`
        provider_avatar_url
      `)
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Error fetching provider avatar:",
      profileError
    );

    return {
      avatarUrl: null,
      error: profileError.message,
    };
  }

  /*
   * Restore provider image.
   */
  const providerAvatar =
    profile?.provider_avatar_url ?? null;

  const { error: updateError } =
    await supabase
      .from("profiles")
      .update({
        avatar_url: providerAvatar,
      })
      .eq("id", user.id);

  if (updateError) {
    console.error(
      "Error restoring provider avatar:",
      updateError
    );

    return {
      avatarUrl: null,
      error: updateError.message,
    };
  }

  return {
    avatarUrl: providerAvatar,
    error: null,
  };
}