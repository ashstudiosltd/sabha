"use client";

import { useState } from "react";
import type { FeedAttachment } from "@/lib/supabase/feed";

type ProjectAttachmentsProps = {
  attachments: FeedAttachment[];
};

export default function ProjectAttachments({
  attachments,
}: ProjectAttachmentsProps) {
  const screenshots = attachments.filter(
    (attachment) => attachment.type === "screenshot"
  );

  const readme = attachments.find(
    (attachment) => attachment.type === "readme"
  );

  const projectLink = attachments.find(
    (attachment) => attachment.type === "project_link"
  );

  const [activeImage, setActiveImage] = useState<string | null>(null);

  if (
    screenshots.length === 0 &&
    !readme &&
    !projectLink
  ) {
    return null;
  }

  return (
    <>
      <div className="mt-6 space-y-4">
        {/* Screenshots */}
        {screenshots.length > 0 && (
          <div
            className={
              screenshots.length === 1
                ? "overflow-hidden rounded-[14px] border border-[#d2d2d7]"
                : "grid grid-cols-2 gap-2 overflow-hidden rounded-[14px]"
            }
          >
            {screenshots.map((screenshot) => (
              <button
                key={screenshot.id}
                type="button"
                onClick={() =>
                  setActiveImage(screenshot.url)
                }
                className="group relative block overflow-hidden bg-[#f5f5f7] text-left"
              >
                <img
                  src={screenshot.url}
                  alt={
                    screenshot.name ??
                    "Project screenshot"
                  }
                  className={
                    screenshots.length === 1
                      ? "h-auto max-h-[520px] w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                      : "aspect-[16/10] h-full w-full rounded-[10px] border border-[#d2d2d7] object-cover transition duration-300 group-hover:scale-[1.02]"
                  }
                />

                <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
              </button>
            ))}
          </div>
        )}

        {/* Project link */}
        {projectLink && (
          <a
            href={projectLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 rounded-[12px] border border-[#d2d2d7] bg-white px-4 py-3.5 transition-colors hover:bg-[#f5f5f7]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f7] text-[14px] text-[#1d1d1f]">
              ↗
            </div>

            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#1d1d1f]">
                View project
              </p>

              <p className="mt-0.5 truncate text-[12px] text-[#1d1d1f]">
                {projectLink.name ??
                  projectLink.url}
              </p>
            </div>
          </a>
        )}

        {/* README */}
        {readme && (
          <a
            href={readme.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 rounded-[12px] border border-[#d2d2d7] bg-white px-4 py-3.5 transition-colors hover:bg-[#f5f5f7]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f7] text-[12px] font-semibold text-[#1d1d1f]">
              MD
            </div>

            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#1d1d1f]">
                README
              </p>

              <p className="mt-0.5 truncate text-[12px] text-[#1d1d1f]">
                {readme.name ?? "README.md"}
              </p>
            </div>
          </a>
        )}
      </div>

      {/* Image viewer */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
            aria-label="Close image"
          >
            ×
          </button>

          <img
            src={activeImage}
            alt="Project screenshot"
            className="max-h-[90vh] max-w-[95vw] rounded-[14px] object-contain shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
    </>
  );
}