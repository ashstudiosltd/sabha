import type { FeedItem } from "@/data/feed-types";

const COLORS = ["#4a8fe7", "#e0744c", "#3fa37a", "#8b6fd6", "#d65a8b", "#c98a1b"];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Same author row as the blog card (avatar / coloured initials + name + @user · date). */
export default function FeedAuthor({
  author,
  createdAt,
}: {
  author: FeedItem["author"];
  createdAt: string;
}) {
  const name = author?.name ?? author?.username ?? "Unknown Devvrat";
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {author?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.avatar_url}
          alt={name}
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-medium text-white"
          style={{ backgroundColor: colorFor(author?.username ?? name) }}
        >
          {initials}
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-[#1d1d1f]">{name}</p>

        <p className="text-[12px] text-[#6e6e73]">
          @{author?.username ?? "unknown"} · {formatDate(createdAt)}
        </p>
      </div>
    </div>
  );
}