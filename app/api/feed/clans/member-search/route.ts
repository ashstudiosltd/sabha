import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_PREFIX = /^[a-z0-9_.-]{2,40}$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to search Sabha members." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const clanId = params.get("clanId") ?? "";
  const query = (params.get("q") ?? "").trim().replace(/^@/, "");
  if (!UUID.test(clanId) || !USERNAME_PREFIX.test(query)) {
    return NextResponse.json({ error: "Enter at least two valid username characters." }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clanId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Member search is temporarily unavailable." }, { status: 503 });
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return NextResponse.json({ error: "Only Clan owners and admins can search for invitees." }, { status: 403 });
  }

  const { data: matches, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, username, avatar_url")
    .ilike("username", `${query}%`)
    .neq("id", user.id)
    .order("username", { ascending: true })
    .limit(40);
  if (profileError) return NextResponse.json({ error: "Member search is temporarily unavailable." }, { status: 503 });

  const candidates = matches ?? [];
  if (!candidates.length) {
    return NextResponse.json({ members: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const { data: existingMembers, error: rosterError } = await supabase
    .from("clan_members")
    .select("user_id")
    .eq("clan_id", clanId)
    .in("user_id", candidates.map((candidate) => candidate.id));
  if (rosterError) return NextResponse.json({ error: "Member search is temporarily unavailable." }, { status: 503 });

  const currentMemberIds = new Set((existingMembers ?? []).map((member) => member.user_id));
  const members = candidates
    .filter((candidate) => !currentMemberIds.has(candidate.id))
    .slice(0, 8)
    .map((profile) => ({
      id: profile.id,
      name: profile.name ?? "Sabha member",
      username: profile.username,
      avatarUrl: profile.avatar_url,
    }));

  return NextResponse.json({ members }, { headers: { "Cache-Control": "private, no-store" } });
}
