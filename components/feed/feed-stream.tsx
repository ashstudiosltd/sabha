import FeedConversationCard from "./feed-conversationcard";
import FeedProjectCard from "./feed-project-card";
import type { FeedItem } from "@/data/feed-types";

interface FeedStreamProps {
  posts: FeedItem[];
}

/** Blog-feed equivalent: a column of cards, or the same empty state. */
export default function FeedStream({ posts }: FeedStreamProps) {
  return (
    <div className="bg-transparent">
      {posts.length > 0 ? (
        <div className="flex flex-col gap-4 bg-transparent">
          {posts.map((item) =>
            item.type === "project" ? (
              <FeedProjectCard key={item.id} item={item} />
            ) : (
              <FeedConversationCard key={item.id} item={item} />
            )
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E1D8] bg-white py-12 text-center">
          <p className="text-[18px] text-[#1D1D1F]">No posts match yet</p>
          <p className="mt-1.5 text-[13.5px] text-[#1D1D1F]/50">
            Try a different category or search term.
          </p>
        </div>
      )}
    </div>
  );
}