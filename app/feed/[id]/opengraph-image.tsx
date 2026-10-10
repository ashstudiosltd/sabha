import { ImageResponse } from "next/og";

import { getFeedPostForShare } from "@/lib/supabase/feed-share-server";

export const runtime = "nodejs";
export const alt = "Devvrats Sabha Feed post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface FeedImageProps {
  params: Promise<{ id: string }>;
}

function truncate(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export default async function Image({ params }: FeedImageProps) {
  const { id } = await params;
  const post = await getFeedPostForShare(id);
  const logoUrl = new URL("/logo.png", "https://sabha.devvrats.in");
  const title = post?.title?.trim() || (post ? `${post.author_name}’s ${post.post_type === "project" ? "project update" : "conversation"}` : "Sabha Feed");
  const body = post ? truncate(post.body, 180) : "Conversations and project updates from the Devvrats community.";
  const titleSize = title.length < 38 ? 56 : title.length < 68 ? 46 : 38;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f5f5f7", padding: "48px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logoUrl.toString()} alt="" width="44" height="44" style={{ objectFit: "contain" }} />
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#1d1d1f" }}>Devvrats</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#6e6e73" }}>Sabha · Feed</div>
        </div>

        <div style={{ display: "flex", flex: 1, marginTop: 28, marginBottom: 28, overflow: "hidden", borderRadius: 28, background: "#ffffff" }}>
          <div style={{ display: "flex", width: 16, background: "#4a8fe7" }} />
          <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", padding: "32px 48px" }}>
            <div style={{ display: "flex", marginBottom: 18, color: "#6e6e73", fontSize: 20, fontWeight: 600 }}>
              {post?.post_type === "project" ? "Project update" : "Community conversation"}
            </div>
            <div style={{ display: "flex", fontSize: titleSize, lineHeight: 1.1, fontWeight: 700, letterSpacing: -1.5, color: "#1d1d1f" }}>
              {truncate(title, 90)}
            </div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 25, lineHeight: 1.4, color: "#6e6e73" }}>
              {body}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#6e6e73", fontSize: 20 }}>
          <div style={{ display: "flex" }}>{post ? `By ${post.author_name}` : "Devvrats Sabha"}</div>
          <div style={{ display: "flex", fontWeight: 600 }}>sabha.devvrats.in</div>
        </div>
      </div>
    ),
    size,
  );
}
