import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        ...(process.env.NODE_ENV === "production"
          ? {
              domain: ".devvrats.in",
            }
          : {}),
      },
    }
  );
}