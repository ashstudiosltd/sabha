import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPE = "image/jpeg";

function clanAvatarPathFromUrl(url: string | null, userId: string, clanId: string) {
  const marker = "/storage/v1/object/public/avatars/";
  if (!url?.includes(marker)) return null;
  try {
    const path = decodeURIComponent(url.split(marker)[1]?.split("?")[0] ?? "");
    return path.startsWith(`${userId}/clan-${clanId}-`) && path.endsWith(".jpg") ? path : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to update this Clan image." }, { status: 401 });

  const formData = await request.formData();
  const clanId = String(formData.get("clanId") ?? "");
  const file = formData.get("file");
  if (!UUID.test(clanId) || !(file instanceof File) || file.type !== IMAGE_TYPE || file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Choose an image that has been reduced to 5 MB or less." }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clanId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Clan image upload is temporarily unavailable." }, { status: 503 });
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return NextResponse.json({ error: "Only Clan owners and admins can update its image." }, { status: 403 });
  }

  const { data: currentClan, error: clanReadError } = await supabase
    .from("clans")
    .select("avatar_url")
    .eq("id", clanId)
    .maybeSingle();
  if (clanReadError || !currentClan) return NextResponse.json({ error: "Clan settings are temporarily unavailable." }, { status: 503 });

  const filePath = `${user.id}/clan-${clanId}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: false, contentType: IMAGE_TYPE, cacheControl: "3600" });
  if (uploadError) {
    return NextResponse.json({ error: "The image couldn’t be uploaded. Check Sabha storage permissions and try again." }, { status: 503 });
  }

  const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
  const { error: saveError } = await supabase.from("clans").update({ avatar_url: avatarUrl }).eq("id", clanId);
  if (saveError) {
    await supabase.storage.from("avatars").remove([filePath]);
    return NextResponse.json({ error: "The image uploaded, but Clan settings couldn’t be saved." }, { status: 503 });
  }

  const previousAvatarPath = clanAvatarPathFromUrl(currentClan.avatar_url, user.id, clanId);
  if (previousAvatarPath && previousAvatarPath !== filePath) {
    await supabase.storage.from("avatars").remove([previousAvatarPath]);
  }

  return NextResponse.json({ avatarUrl }, { headers: { "Cache-Control": "private, no-store" } });
}
