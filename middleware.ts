import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request,
            });
            response.cookies.set(name, value, {
              ...options,
              domain:
                process.env.NODE_ENV === "production"
                  ? ".devvrats.in"
                  : undefined,
              secure: process.env.NODE_ENV === "production",
            });
          });
        },
      },
    }
  );
  await supabase.auth.getUser();
  return response;
}
export const config = {
  matcher: [
    /*
     * Run middleware on all routes except:
     * - _next/static
     * - _next/image
     * - favicon
     * - common image/file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};