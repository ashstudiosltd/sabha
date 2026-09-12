import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function middleware(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                request.cookies.set(
                  name,
                  value
                );

                response =
                  NextResponse.next({
                    request,
                  });

                response.cookies.set(
                  name,
                  value,
                  {
                    ...options,
                    domain:
                      process.env
                        .NODE_ENV ===
                      "production"
                        ? ".devvrats.in"
                        : undefined,
                    secure:
                      process.env
                        .NODE_ENV ===
                      "production",
                  }
                );
              }
            );
          },
        },
      }
    );

  /*
   * Refresh the Supabase session.
   *
   * We do this even on public pages so that
   * an existing session stays synchronized.
   */
  await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  /*
   * Public routes.
   *
   * These can be opened without signing in.
   */
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/blogs") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/sabha");

  /*
   * Everything else can remain protected.
   */
  if (!isPublicRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const authUrl =
        new URL(
          "/auth",
          request.url
        );

      authUrl.searchParams.set(
        "next",
        pathname +
          request.nextUrl.search
      );

      return NextResponse.redirect(
        authUrl
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};