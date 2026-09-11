import { createClient } from "@/lib/supabase/server";

import { NextResponse } from "next/server";

export async function GET(request: Request) {

  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {

    return NextResponse.redirect(

      `${origin}/registration?error=no_code`

    );

  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {

    console.error("AUTH CALLBACK ERROR:", error);

    return NextResponse.redirect(

      `${origin}/registration?error=${encodeURIComponent(error.message)}`

    );

  }

  return NextResponse.redirect(`${origin}/`);
}