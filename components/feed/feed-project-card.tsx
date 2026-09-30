import FeedActions from "@/components/feed/feed-actions";
import ProjectAttachments from "@/components/feed/project-attachments";
import FeedAuthor from "./feed-author";
import type { FeedItem } from "@/data/feed-types";

export default function FeedProjectCard({ item }: { item: FeedItem }) {
  const project = item.project;
  if (!project) return null;

  return (
    <article
      id={`post-${item.id}`}
      className="group scroll-mt-[90px] overflow-hidden rounded-[18px] border-l-[8px] border-l-[#4a8fe7] bg-white p-4 transition-shadow duration-150 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:px-5 sm:py-5"
    >
      {/* Author */}
      <FeedAuthor author={item.author} createdAt={item.created_at} />

      {/* Content */}
      <div className="mt-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.022em] text-[#1d1d1f]">
            {project.title}
          </h2>

          {project.description && (
            <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[14px] leading-6 text-[#6e6e73]">
              {project.description}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-[4px] bg-[#d6e4f8] px-2.5 py-1 text-[11px] font-medium text-[#1a4a8f]">
            #project
          </span>

          {project.project_url && (
            <a
              href={project.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-[13px] text-[#0066cc] transition-colors hover:underline"
            >
              View project ↗
            </a>
          )}
        </div>

        <ProjectAttachments attachments={item.attachments} />

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