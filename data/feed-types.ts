import type { getPublicFeed } from "@/lib/supabase/feed";

export type FeedItem = Awaited<ReturnType<typeof getPublicFeed>>[number];