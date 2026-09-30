"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#6e6e73]";
const fieldClass =
  "w-full rounded-[12px] border border-[#d2d2d7] bg-white px-4 py-3 text-[16px] text-[#1d1d1f] outline-none transition-colors placeholder:text-[#6e6e73] focus:border-[#0071e3] disabled:opacity-60";

export default function CreateClan() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);

    setSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50)
    );
  }

  async function handleCreate() {
    if (loading) return;

    setError("");

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Clan name must be at least 2 characters.");
      return;
    }

    if (!/^[a-z0-9-]{3,50}$/.test(cleanSlug)) {
      setError(
        "Slug must be 3–50 characters and use only lowercase letters, numbers, and hyphens."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to create a clan.");
        return;
      }

      const { data: clan, error: clanError } = await supabase
        .from("clans")
        .insert({
          owner_id: user.id,
          name: cleanName,
          slug: cleanSlug,
          description: description.trim() || null,
          visibility,
        })
        .select()
        .single();

      if (clanError) {
        if (clanError.code === "23505") {
          setError("That clan link is already taken. Try another one.");
        } else {
          console.error(clanError);
          setError(clanError.message || "Failed to create clan.");
        }

        return;
      }

      /*
       * Add creator as the first member.
       * The creator becomes owner in both places:
       * clans.owner_id and clan_members.role
       */
      const { error: memberError } = await supabase
        .from("clan_members")
        .insert({
          clan_id: clan.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) {
        console.error(memberError);

        /* Roll back the clan if membership creation failed. */
        await supabase.from("clans").delete().eq("id", clan.id);

        setError("Couldn't finish setting up the clan. Please try again.");

        return;
      }

      router.push(`/clan/${clan.slug}`);
      router.refresh();
    } catch (error) {
      console.error(error);

      setError("Something went wrong while creating the clan.");
    } finally {
      setLoading(false);
    }
  }

  const options = [
    {
      value: "private" as const,
      title: "Private",
      text: "Only members can access the clan and its feed.",
      Icon: Lock,
    },
    {
      value: "public" as const,
      title: "Public",
      text: "Anyone can discover and view the clan.",
      Icon: Globe,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">

      <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
        <Link href="/feed" className="text-[14px] text-[#0066cc] hover:underline">
          ← Back to feed
        </Link>

        <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[40px]">
          Create a clan.
        </h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">
          Create a space for people to build, discuss and grow together.
        </p>

        <div className="mt-6 space-y-5 rounded-[18px] bg-white p-5 sm:p-8">
          {/* Name */}
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="clan-name" className={labelClass}>
                Clan name
              </label>
              <span className="text-[12px] text-[#6e6e73]">{name.length}/80</span>
            </div>

            <input
              id="clan-name"
              type="text"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Devvrats Core"
              maxLength={80}
              autoFocus
              disabled={loading}
              className={fieldClass}
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="clan-slug" className={labelClass}>
              Clan link
            </label>

            <div className="flex overflow-hidden rounded-[12px] border border-[#d2d2d7] bg-white transition-colors focus-within:border-[#0071e3]">
              <span className="flex items-center border-r border-[#e8e8ed] bg-[#f5f5f7] px-3.5 text-[15px] text-[#6e6e73]">
                /clan/
              </span>

              <input
                id="clan-slug"
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                      .slice(0, 50)
                  )
                }
                placeholder="devvrats-core"
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[16px] text-[#1d1d1f] outline-none placeholder:text-[#6e6e73] disabled:opacity-60"
              />
            </div>

            <p className="mt-2 text-[12px] text-[#6e6e73]">
              Lowercase letters, numbers and hyphens only.
            </p>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="clan-description" className={labelClass}>
                Description
              </label>
              <span className="text-[12px] text-[#6e6e73]">
                {description.length}/10000
              </span>
            </div>

            <textarea
              id="clan-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this clan about?"
              maxLength={10000}
              rows={6}
              disabled={loading}
              className={`${fieldClass} resize-y leading-7`}
            />
          </div>

          {/* Visibility */}
          <div>
            <span className={labelClass}>Visibility</span>

            <div
              role="radiogroup"
              aria-label="Clan visibility"
              className="grid gap-3 sm:grid-cols-2"
            >
              {options.map(({ value, title, text, Icon }) => {
                const active = visibility === value;

                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={loading}
                    onClick={() => setVisibility(value)}
                    className={`flex items-start gap-3.5 rounded-[14px] border p-4 text-left transition-colors disabled:opacity-60 ${
                      active
                        ? "border-[#1d1d1f] bg-[#f5f5f7]"
                        : "border-[#d2d2d7] bg-white hover:bg-[#f5f5f7]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                        active
                          ? "bg-[#1d1d1f] text-white"
                          : "bg-[#f5f5f7] text-[#1d1d1f]"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-[#1d1d1f]">
                        {title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-5 text-[#6e6e73]">
                        {text}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-[12px] border border-[#ff3b30]/30 bg-[#ff3b30]/5 px-4 py-3 text-[14px] text-[#d70015]"
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Link
              href="/feed"
              aria-disabled={loading}
              className={`rounded-[8px] border border-[#d2d2d7] px-5 py-2.5 text-center text-[15px] text-[#1d1d1f] hover:bg-[#f5f5f7] ${
                loading ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="rounded-[8px] bg-[#1d1d1f] px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create clan"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}