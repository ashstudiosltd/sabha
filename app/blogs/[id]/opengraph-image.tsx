import {
  ImageResponse,
} from "next/og";

import {
  getBlogPostByIdServer,
} from "@/lib/supabase/blog-server";

export const runtime = "nodejs";

export const alt =
  "Devvrats Sabha blog post";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType =
  "image/png";

interface OpenGraphImageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Image({
  params,
}: OpenGraphImageProps) {
  const { id } = await params;

  const post =
    await getBlogPostByIdServer(id);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            background: "#FAFAF7",
            color: "#1B1B18",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 3,
            }}
          >
            DEVVRATS
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 72,
              fontWeight: 700,
            }}
          >
            Sabha
          </div>
        </div>
      ),
      size
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#FAFAF7",
          color: "#1B1B18",
          border: "1px solid #E6E3DA",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#1B1B18",
                color: "#FAFAF7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              D
            </div>

            DEVVRATS
          </div>

          <div
            style={{
              fontSize: 22,
              color: "#8A8577",
              letterSpacing: 1,
            }}
          >
            SABHA
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#6E4B2A",
              fontWeight: 600,
              marginBottom: 22,
            }}
          >
            {post.category}
          </div>

          <div
            style={{
              fontSize:
                post.title.length > 65
                  ? 48
                  : 58,
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: -1.5,
            }}
          >
            {post.title}
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 25,
              lineHeight: 1.4,
              color: "#777268",
              maxWidth: 900,
            }}
          >
            {post.excerpt}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div
              style={{
                fontSize: 21,
                fontWeight: 600,
              }}
            >
              {post.author.name}
            </div>

            <div
              style={{
                fontSize: 18,
                color: "#8A8577",
              }}
            >
              {post.readTime}
            </div>
          </div>

          <div
            style={{
              fontSize: 20,
              color: "#8A8577",
            }}
          >
            sabha.devvrats.in
          </div>
        </div>
      </div>
    ),
    size
  );
}