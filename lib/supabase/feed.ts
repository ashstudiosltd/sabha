import { createClient } from "@/lib/supabase/server";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type FeedItem = {
  id: string;
  author_id: string;
  clan_id: string | null;
  type: "conversation" | "project";
  created_at: string;
  updated_at: string;
};

export type FeedAuthor = {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
};

export type Conversation = {
  id: string;
  content: string;
};

export type Project = {
  id: string;
  title: string;
  description: string | null;
  project_url: string | null;
};

export type FeedAttachment = {
  id: string;
  feed_item_id: string;
  type: "project_link" | "screenshot" | "readme";
  url: string;
  name: string | null;
  sort_order: number;
};

export type FeedPost = FeedItem & {
  author: FeedAuthor | null;
  conversation: Conversation | null;
  project: Project | null;
  attachments: FeedAttachment[];
  likesCount: number;
  commentsCount: number;
  likedByCurrentUser: boolean;
};

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

async function getSignedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
) {
  const { data, error } = await supabase.storage
    .from("feed-assets")
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error(
      "Failed to create signed URL:",
      error
    );

    return null;
  }

  return data.signedUrl;
}

/* -------------------------------------------------------------------------- */
/* Public Feed                                                                */
/* -------------------------------------------------------------------------- */

export async function getPublicFeed(
  limit = 20
): Promise<FeedPost[]> {
  const supabase = await createClient();

  /* ---------------------------------------------------------------------- */
  /* Current user                                                           */
  /* ---------------------------------------------------------------------- */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ---------------------------------------------------------------------- */
  /* Feed items                                                             */
  /* ---------------------------------------------------------------------- */

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from("feed_items")
    .select(`
      id,
      author_id,
      clan_id,
      type,
      created_at,
      updated_at
    `)
    .is("clan_id", null)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (itemsError) {
    console.error(
      "Failed to fetch feed items:",
      itemsError
    );

    return [];
  }

  if (!items?.length) {
    return [];
  }

  /* ---------------------------------------------------------------------- */
  /* IDs                                                                     */
  /* ---------------------------------------------------------------------- */

  const itemIds = items.map(
    (item) => item.id
  );

  const authorIds = [
    ...new Set(
      items.map((item) => item.author_id)
    ),
  ];

  /* ---------------------------------------------------------------------- */
  /* Fetch related data                                                      */
  /* ---------------------------------------------------------------------- */

  const [
    { data: authors, error: authorsError },
    {
      data: conversations,
      error: conversationsError,
    },
    { data: projects, error: projectsError },
    {
      data: attachments,
      error: attachmentsError,
    },
    { data: likes, error: likesError },
    { data: comments, error: commentsError },
  ] = await Promise.all([
    /* Authors */
    supabase
      .from("profiles")
      .select(
        "id, username, name, avatar_url"
      )
      .in("id", authorIds),

    /* Conversations */
    supabase
      .from("conversations")
      .select("id, content")
      .in("id", itemIds),

    /* Projects */
    supabase
      .from("projects")
      .select(
        "id, title, description, project_url"
      )
      .in("id", itemIds),

    /* Attachments */
    supabase
      .from("feed_attachments")
      .select(`
        id,
        feed_item_id,
        type,
        url,
        name,
        sort_order
      `)
      .in("feed_item_id", itemIds)
      .order("sort_order", {
        ascending: true,
      }),

    /* Likes */
    supabase
      .from("feed_likes")
      .select(
        "feed_item_id, user_id"
      )
      .in("feed_item_id", itemIds),

    /* Comments */
    supabase
      .from("feed_comments")
      .select("feed_item_id")
      .in("feed_item_id", itemIds),
  ]);

  /* ---------------------------------------------------------------------- */
  /* Errors                                                                  */
  /* ---------------------------------------------------------------------- */

  if (authorsError) {
    console.error(
      "Failed to fetch feed authors:",
      authorsError
    );
  }

  if (conversationsError) {
    console.error(
      "Failed to fetch conversations:",
      conversationsError
    );
  }

  if (projectsError) {
    console.error(
      "Failed to fetch projects:",
      projectsError
    );
  }

  if (attachmentsError) {
    console.error(
      "Failed to fetch attachments:",
      attachmentsError
    );
  }

  if (likesError) {
    console.error(
      "Failed to fetch likes:",
      likesError
    );
  }

  if (commentsError) {
    console.error(
      "Failed to fetch comments:",
      commentsError
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Maps                                                                    */
  /* ---------------------------------------------------------------------- */

  const authorMap = new Map<
    string,
    FeedAuthor
  >();

  for (const author of authors ?? []) {
    authorMap.set(author.id, author);
  }

  const conversationMap = new Map<
    string,
    Conversation
  >();

  for (const conversation of conversations ?? []) {
    conversationMap.set(
      conversation.id,
      conversation
    );
  }

  const projectMap = new Map<
    string,
    Project
  >();

  for (const project of projects ?? []) {
    projectMap.set(
      project.id,
      project
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Attachment map                                                         */
  /* ---------------------------------------------------------------------- */

  const attachmentsMap = new Map<
    string,
    FeedAttachment[]
  >();

  for (const attachment of attachments ?? []) {
    const current =
      attachmentsMap.get(
        attachment.feed_item_id
      ) ?? [];

    current.push(attachment);

    attachmentsMap.set(
      attachment.feed_item_id,
      current
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Like counts                                                             */
  /* ---------------------------------------------------------------------- */

  const likesMap = new Map<
    string,
    number
  >();

  for (const like of likes ?? []) {
    likesMap.set(
      like.feed_item_id,
      (likesMap.get(
        like.feed_item_id
      ) ?? 0) + 1
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Comment counts                                                          */
  /* ---------------------------------------------------------------------- */

  const commentsMap = new Map<
    string,
    number
  >();

  for (const comment of comments ?? []) {
    commentsMap.set(
      comment.feed_item_id,
      (commentsMap.get(
        comment.feed_item_id
      ) ?? 0) + 1
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Current user's likes                                                    */
  /* ---------------------------------------------------------------------- */

  const likedItems = new Set(
    (likes ?? [])
      .filter(
        (like) =>
          like.user_id === user?.id
      )
      .map(
        (like) =>
          like.feed_item_id
      )
  );

  /* ---------------------------------------------------------------------- */
  /* Signed attachment URLs                                                  */
  /* ---------------------------------------------------------------------- */

  const attachmentsWithUrls =
    new Map<
      string,
      FeedAttachment[]
    >();

  for (const item of items) {
    const itemAttachments =
      attachmentsMap.get(item.id) ?? [];

    const resolvedAttachments =
      await Promise.all(
        itemAttachments.map(
          async (attachment) => {
            const signedUrl =
              await getSignedUrl(
                supabase,
                attachment.url
              );

            return {
              ...attachment,

              /*
               * Keep the original path if
               * signed URL generation fails.
               */
              url:
                signedUrl ??
                attachment.url,
            };
          }
        )
      );

    attachmentsWithUrls.set(
      item.id,
      resolvedAttachments
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Build final Feed posts                                                  */
  /* ---------------------------------------------------------------------- */

  return items.map((item) => ({
    ...item,

    author:
      authorMap.get(
        item.author_id
      ) ?? null,

    conversation:
      conversationMap.get(
        item.id
      ) ?? null,

    project:
      projectMap.get(
        item.id
      ) ?? null,

    attachments:
      attachmentsWithUrls.get(
        item.id
      ) ?? [],

    likesCount:
      likesMap.get(item.id) ?? 0,

    commentsCount:
      commentsMap.get(item.id) ?? 0,

    likedByCurrentUser:
      likedItems.has(item.id),
  }));
}
export async function getClanFeed(
  clanId: string,
  limit = 20
): Promise<FeedPost[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from("feed_items")
    .select(`
      id,
      author_id,
      clan_id,
      type,
      created_at,
      updated_at
    `)
    .eq("clan_id", clanId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (itemsError) {
    console.error(
      "Failed to fetch clan feed:",
      itemsError
    );

    return [];
  }

  if (!items?.length) {
    return [];
  }

  const itemIds = items.map(
    (item) => item.id
  );

  const authorIds = [
    ...new Set(
      items.map((item) => item.author_id)
    ),
  ];

  const [
    { data: authors },
    { data: conversations },
    { data: projects },
    { data: attachments },
    { data: likes },
    { data: comments },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, username, name, avatar_url"
      )
      .in("id", authorIds),

    supabase
      .from("conversations")
      .select("id, content")
      .in("id", itemIds),

    supabase
      .from("projects")
      .select(
        "id, title, description, project_url"
      )
      .in("id", itemIds),

    supabase
      .from("feed_attachments")
      .select(`
        id,
        feed_item_id,
        type,
        url,
        name,
        sort_order
      `)
      .in("feed_item_id", itemIds)
      .order("sort_order", {
        ascending: true,
      }),

    supabase
      .from("feed_likes")
      .select(
        "feed_item_id, user_id"
      )
      .in("feed_item_id", itemIds),

    supabase
      .from("feed_comments")
      .select("feed_item_id")
      .in("feed_item_id", itemIds),
  ]);

  const authorMap = new Map<
    string,
    FeedAuthor
  >();

  for (const author of authors ?? []) {
    authorMap.set(author.id, author);
  }

  const conversationMap = new Map<
    string,
    Conversation
  >();

  for (const conversation of conversations ?? []) {
    conversationMap.set(
      conversation.id,
      conversation
    );
  }

  const projectMap = new Map<
    string,
    Project
  >();

  for (const project of projects ?? []) {
    projectMap.set(
      project.id,
      project
    );
  }

  const attachmentsMap = new Map<
    string,
    FeedAttachment[]
  >();

  for (const attachment of attachments ?? []) {
    const current =
      attachmentsMap.get(
        attachment.feed_item_id
      ) ?? [];

    current.push(attachment);

    attachmentsMap.set(
      attachment.feed_item_id,
      current
    );
  }

  const likesMap = new Map<
    string,
    number
  >();

  for (const like of likes ?? []) {
    likesMap.set(
      like.feed_item_id,
      (likesMap.get(
        like.feed_item_id
      ) ?? 0) + 1
    );
  }

  const commentsMap = new Map<
    string,
    number
  >();

  for (const comment of comments ?? []) {
    commentsMap.set(
      comment.feed_item_id,
      (commentsMap.get(
        comment.feed_item_id
      ) ?? 0) + 1
    );
  }

  const likedItems = new Set(
    (likes ?? [])
      .filter(
        (like) =>
          like.user_id === user?.id
      )
      .map(
        (like) =>
          like.feed_item_id
      )
  );

  const attachmentsWithUrls =
    new Map<
      string,
      FeedAttachment[]
    >();

  for (const item of items) {
    const itemAttachments =
      attachmentsMap.get(item.id) ?? [];

    const resolved =
      await Promise.all(
        itemAttachments.map(
          async (attachment) => {
            const signedUrl =
              await getSignedUrl(
                supabase,
                attachment.url
              );

            return {
              ...attachment,
              url:
                signedUrl ??
                attachment.url,
            };
          }
        )
      );

    attachmentsWithUrls.set(
      item.id,
      resolved
    );
  }

  return items.map((item) => ({
    ...item,

    author:
      authorMap.get(
        item.author_id
      ) ?? null,

    conversation:
      conversationMap.get(
        item.id
      ) ?? null,

    project:
      projectMap.get(
        item.id
      ) ?? null,

    attachments:
      attachmentsWithUrls.get(
        item.id
      ) ?? [],

    likesCount:
      likesMap.get(item.id) ?? 0,

    commentsCount:
      commentsMap.get(item.id) ?? 0,

    likedByCurrentUser:
      likedItems.has(item.id),
  }));
}