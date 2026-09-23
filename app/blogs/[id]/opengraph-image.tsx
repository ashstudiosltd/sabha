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

/*
 * Keeps long text inside the card so nothing is ever cut off
 * mid-word or pushed out of the 1200x630 canvas.
 */
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();

  if (clean.length <= max) return clean;

  return `${clean.slice(0, max).trimEnd()}…`;
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

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#f5f5f7",
            padding: "56px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              background: "#ffffff",
              borderRadius: 28,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 16,
                background: "#4a8fe7",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 64px",
                flex: 1,
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
                    display: "flex",
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#1d1d1f",
                  }}
                >
                  Devvrats
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 18,
                  fontSize: 84,
                  fontWeight: 700,
                  letterSpacing: -2,
                  color: "#1d1d1f",
                }}
              >
                Sabha
              </div>
            </div>
          </div>
        </div>
      ),
      size
    );
  }

  const title = truncate(post.title, 100);
  const excerpt = truncate(post.excerpt, 120);

  const titleSize =
    title.length <= 40
      ? 60
      : title.length <= 70
        ? 52
        : 44;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f5f7",
          padding: "48px 64px",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <img
              src={logoUrl.toString()}
              width="44"
              height="44"
              style={{
                objectFit: "contain",
              }}
            />

            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: -0.5,
                color: "#1d1d1f",
              }}
            >
              Devvrats
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              color: "#6e6e73",
            }}
          >
            Sabha
          </div>
        </div>

        {/* POST CARD */}

        <div
          style={{
            display: "flex",
            flex: 1,
            marginTop: 28,
            marginBottom: 28,
            background: "#ffffff",
            borderRadius: 28,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 16,
              background: "#4a8fe7",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              padding: "32px 48px",
            }}
          >
            {post.category ? (
              <div
                style={{
                  display: "flex",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: "#cfe0f7",
                    color: "#1a4a8a",
                    fontSize: 22,
                    fontWeight: 700,
                    padding: "6px 16px",
                    borderRadius: 8,
                  }}
                >
                  {post.category}
                </div>
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                lineHeight: 1.1,
                fontWeight: 700,
                letterSpacing: -1.5,
                color: "#1d1d1f",
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 25,
                lineHeight: 1.4,
                color: "#6e6e73",
              }}
            >
              {excerpt}
            </div>
          </div>
        </div>

        {/* FOOTER */}

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
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                color: "#1d1d1f",
              }}
            >
              {post.author.name}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#6e6e73",
              }}
            >
              · {post.readTime}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#6e6e73",
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