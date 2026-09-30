import FeedActions from "@/components/feed/feed-actions";
import FeedAuthor from "./feed-author";
import type { FeedItem } from "@/data/feed-types";

export default function FeedConversationCard({ item }: { item: FeedItem }) {
  const conversation = item.conversation;
  if (!conversation) return null;

  return (
    <article
      id={`post-${item.id}`}
      className="group scroll-mt-[90px] overflow-hidden rounded-[18px] border-l-[8px] border-l-[#8e8e93] bg-white p-4 transition-shadow duration-150 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:px-5 sm:py-5"
    >
      {/* Author */}
      <FeedAuthor author={item.author} createdAt={item.created_at} />

      {/* Content */}
      <div className="mt-3">
        <p className="whitespace-pre-wrap text-[16px] leading-7 tracking-[-0.01em] text-[#1d1d1f]">
          {conversation.content}
        </p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-[4px] bg-[#e8e8ed] px-2.5 py-1 text-[11px] font-medium text-[#424245]">
            #conversation
          </span>
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-[#e8e8ed] pt-3">
          <FeedActions
            feedItemId={item.id}
            initialLikes={item.likesCount}
            initialComments={item.commentsCount}
            initialLiked={item.likedByCurrentUser}
          />
        </div>
      </div>
    </article>
  );
}