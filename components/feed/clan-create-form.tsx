"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

function makeSlug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54).replace(/-$/g, "");
}

export default function ClanCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = useMemo(() => makeSlug(name), [name]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (cleanName.length < 2 || !slug) return setError("Add a Clan name with at least two letters or numbers.");
    if (cleanDescription.length > 1000) return setError("Keep the description under 1,000 characters.");

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: createError } = await supabase.rpc("create_clan", {
      p_name: cleanName,
      p_slug: slug,
      p_description: cleanDescription,
      p_visibility: visibility,
      p_avatar_url: avatarUrl.trim() || null,
    });
    if (createError || typeof data !== "string") {
      setError(createError?.code === "23505" ? "That Clan URL is already in use. Try a slightly different name." : "The Clan couldn’t be created. Please try again.");
      setBusy(false);
      return;
    }

    router.push(`/feed/clans/${slug}`);
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/feed?view=clans" className="text-[14px] text-[#0066cc] hover:underline">← Back to Clans</Link>
      <header className="mt-7">
        <h1 className="m-0 text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#1d1d1f] sm:text-[40px]">Create a Clan</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#6e6e73]">Give your community a home to share progress and build together.</p>
      </header>

      <form onSubmit={submit} className="mt-6 grid gap-5 rounded-[18px] border border-[#e5e5ea] bg-white p-5 sm:p-8">
        <label className="grid gap-2 text-[13px] font-medium text-[#424245]">
          Clan name
          <input className="sabha-field h-12 px-4 text-[15px]" value={name} onChange={(event) => setName(event.target.value)} placeholder="For example, Open Source Builders" maxLength={60} required />
        </label>
        <label className="grid gap-2 text-[13px] font-medium text-[#424245]">
          What is this Clan about?
          <textarea className="sabha-field min-h-[140px] resize-y px-4 py-3 text-[14px] leading-6" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what members are building or learning together." maxLength={1000} />
        </label>
        <label className="grid gap-2 text-[13px] font-medium text-[#424245]">
          Clan avatar URL <span className="font-normal text-[#8a8a8f]">Optional · HTTPS image link</span>
          <input className="sabha-field h-12 px-4 text-[14px]" type="url" inputMode="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/clan-avatar.png" maxLength={2048} />
        </label>
        <fieldset className="grid gap-3 border-0 p-0">
          <legend className="mb-2 text-[13px] font-medium text-[#424245]">Who can join?</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#e5e5ea] p-4">
            <input type="radio" name="clan-visibility" value="public" checked={visibility === "public"} onChange={() => setVisibility("public")} className="mt-1 accent-[#0071e3]" />
            <span><strong className="block text-[13px] font-medium text-[#1d1d1f]">Public</strong><span className="mt-1 block text-[12px] leading-5 text-[#6e6e73]">Anyone in Sabha can find, join, and read this Clan.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#e5e5ea] p-4">
            <input type="radio" name="clan-visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} className="mt-1 accent-[#0071e3]" />
            <span><strong className="block text-[13px] font-medium text-[#1d1d1f]">Private</strong><span className="mt-1 block text-[12px] leading-5 text-[#6e6e73]">Only members can find the space and see its posts. Owners and admins invite members.</span></span>
          </label>
        </fieldset>
        <div className="rounded-[12px] bg-[#f5f5f7] px-4 py-3 text-[12px] leading-5 text-[#6e6e73]">
          <span className="font-medium text-[#424245]">{visibility === "public" ? "Public Clan" : "Private Clan"}</span> · {visibility === "public" ? "Anyone signed in can discover, join, and read its posts." : "Not listed publicly. Invitees join through a private invitation."}
          {slug && <span className="mt-1 block break-all">sabha.devvrats.in/feed/clans/{slug}</span>}
        </div>
        {error && <p className="m-0 text-[13px] leading-5 text-red-600" role="alert">{error}</p>}
        <div className="flex justify-end border-t border-[#e8e8ed] pt-4">
          <button type="submit" className="sabha-button sabha-button-primary" disabled={busy}>{busy ? "Creating…" : "Create Clan"}</button>
        </div>
      </form>
    </div>
  );
}
