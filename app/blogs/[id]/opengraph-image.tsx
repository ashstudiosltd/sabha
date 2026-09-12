import { ImageResponse } from "next/og";

import {
  getBlogPostByIdServer,
} from "@/lib/supabase/blog-server";

export const runtime = "nodejs";

export const alt = "Devvrats Sabha blog post";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

interface OpenGraphImageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Image({
  params,
}: OpenGraphImageProps) {
  const { id } = await params;

  const post = await getBlogPostByIdServer(id);

  /*
   * Actual Devvrats logo.
   *
   * Change this path ONLY if your logo has a different
   * filename/location inside /public.
   */
  const logoUrl = new URL(
    "/logo.png",
    "https://sabha.devvrats.in"
  );

  /*
   * Ambient backdrop, matching the blog post page.
   * Change this path ONLY if the file lives elsewhere in /public.
   */
  const bgUrl = new URL(
    "/login-bg.jpg",
    "https://sabha.devvrats.in"
  );

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            backgroundImage: `url(${bgUrl.toString()})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(11,7,20,0.72) 0%, rgba(11,7,20,0.55) 45%, rgba(11,7,20,0.82) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "80px",
              width: "100%",
              height: "100%",
              color: "#FAFAF7",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <img
                src={logoUrl.toString()}
                width="52"
                height="52"
                style={{
                  objectFit: "contain",
                }}
              />

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                Devvrats
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                fontSize: 72,
                fontWeight: 700,
              }}
            >
              Sabha
            </div>
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
          position: "relative",
          backgroundImage: `url(${bgUrl.toString()})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* SCRIM */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(11,7,20,0.72) 0%, rgba(11,7,20,0.42) 45%, rgba(11,7,20,0.8) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            width: "100%",
            height: "100%",
          }}
        >
          {/* HEADER */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* DEVVRATS BRAND */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <img
                src={logoUrl.toString()}
                width="46"
                height="46"
                style={{
                  objectFit: "contain",
                }}
              />

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: -0.5,
                  color: "#FAFAF7",
                }}
              >
                Devvrats
              </div>
            </div>

            {/* SABHA */}

            <div
              style={{
                fontSize: 22,
                color: "#D8D4C8",
                letterSpacing: 1,
              }}
            >
              Sabha
            </div>
          </div>

          {/* POST CONTENT CARD */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 1040,
              background: "rgba(250,250,247,0.94)",
              border: "1px solid rgba(230,227,218,0.9)",
              borderRadius: 24,
              padding: "40px 48px",
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: "#6E4B2A",
                fontWeight: 600,
                marginBottom: 18,
              }}
            >
              {post.category}
            </div>

            <div
              style={{
                fontSize:
                  post.title.length > 65
                    ? 44
                    : 54,
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: -1.5,
                color: "#1B1B18",
              }}
            >
              {post.title}
            </div>

            <div
              style={{
                marginTop: 20,
                fontSize: 23,
                lineHeight: 1.4,
                color: "#777268",
                maxWidth: 900,
              }}
            >
              {post.excerpt}
            </div>
          </div>

          {/* FOOTER */}

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
                  color: "#FAFAF7",
                }}
              >
                {post.author.name}
              </div>

              <div
                style={{
                  fontSize: 18,
                  color: "#D8D4C8",
                }}
              >
                {post.readTime}
              </div>
            </div>

            <div
              style={{
                fontSize: 20,
                color: "#D8D4C8",
              }}
            >
              sabha.devvrats.in
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}