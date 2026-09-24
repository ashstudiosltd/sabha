import type { TrendingItem } from "@/data/blog";

interface TrendingBlogsProps {
  items: TrendingItem[];
}

export default function TrendingBlogs({ items }: TrendingBlogsProps) {
  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3">
          <span className="mt-0.5 w-4 shrink-0  text-[13px] text-[#1D1D1F]/40">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <a
              href="#"
              className="line-clamp-2 inline-block text-[13.5px] leading-snug text-[#1D1D1F] transition-transform duration-150 active:scale-[0.98] hover:underline decoration-[#5B8C6E] underline-offset-4"
            >
              {item.title}
            </a>
            <p className="mt-1 text-[12px] text-[#1D1D1F]/50">
              {item.authorName} · {item.date}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}