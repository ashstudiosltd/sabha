import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "This Clan could not be found." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete this Clan." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Clan deletion is temporarily unavailable." }, { status: 503 });
  if (membership?.role !== "owner") return NextResponse.json({ error: "Only the Clan owner can delete it." }, { status: 403 });

  const { data: clan, error: clanError } = await supabase
    .from("clans")
    .select("id, slug, avatar_url")
    .eq("id", id)
    .maybeSingle();
  if (clanError || !clan) return NextResponse.json({ error: "This Clan could not be found." }, { status: 404 });

  const { error: deleteError } = await supabase.from("clans").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: "The Clan couldn’t be deleted. Please try again." }, { status: 503 });

  const marker = "/storage/v1/object/public/avatars/";
  let avatarPath = "";
  if (clan.avatar_url?.includes(marker)) {
    try {
      avatarPath = decodeURIComponent(clan.avatar_url.split(marker)[1]?.split("?")[0] ?? "");
    } catch {
      avatarPath = "";
    }
  }
  const currentAvatarPrefix = `${user.id}/clan-${id}-`;
  const isCurrentAvatar = avatarPath.startsWith(currentAvatarPrefix) && avatarPath.endsWith(".jpg");
  const isLegacyAvatar = ["webp", "png", "jpg", "jpeg"].some((extension) => avatarPath === `${user.id}/clan-${id}.${extension}`);
  if (isCurrentAvatar || isLegacyAvatar) {
    await supabase.storage.from("avatars").remove([avatarPath]);
  }

  return NextResponse.json({ ok: true, redirectTo: "/feed?view=clans" });
}
