import { sabhaAuthReturn } from "@/lib/auth-return";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next = sabhaAuthReturn(requestUrl.searchParams.get("next"), requestUrl.origin);

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL(next, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL(`/auth?error=auth&next=${encodeURIComponent(next)}`, requestUrl.origin)
  );
}