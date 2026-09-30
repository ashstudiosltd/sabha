"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ClanSettingsProps = {
  clanId: string;
  initialName: string;
  initialDescription: string | null;
  initialVisibility: "private" | "public";
};

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#6e6e73]";
const fieldClass =
  "w-full rounded-[12px] border border-[#d2d2d7] bg-white px-4 py-3 text-[16px] text-[#1d1d1f] outline-none transition-colors placeholder:text-[#6e6e73] focus:border-[#0071e3] disabled:opacity-60";

export default function ClanSettings({
  clanId,
  initialName,
  initialDescription,
  initialVisibility,
}: ClanSettingsProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [visibility, setVisibility] = useState<"private" | "public">(
    initialVisibility
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const dirty =
    name.trim() !== initialName ||
    description.trim() !== (initialDescription ?? "").trim() ||
    visibility !== initialVisibility;

  async function handleSave() {
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 2) {
      setMessage({
        type: "error",
        text: "Clan name must be at least 2 characters.",
      });
      return;
    }

    if (trimmedName.length > 80) {
      setMessage({
        type: "error",
        text: "Clan name cannot exceed 80 characters.",
      });
      return;
    }

    if (trimmedDescription.length > 10000) {
      setMessage({
        type: "error",
        text: "Description cannot exceed 10,000 characters.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("clans")
      .update({
        name: trimmedName,
        description: trimmedDescription || null,
        visibility,
      })
      .eq("id", clanId);

    if (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error.message || "Unable to update clan.",
      });
      setSaving(false);
      return;
    }

    setMessage({ type: "success", text: "Clan updated." });
    setSaving(false);

    router.refresh();
  }

  const options = [
    {
      value: "public" as const,
      title: "Public",
      text: "Anyone can discover and join this clan.",
      Icon: Globe,
    },
    {
      value: "private" as const,
      title: "Private",
      text: "People need approval to join.",
      Icon: Lock,
    },
  ];

  return (
    <section className="rounded-[18px] bg-white p-5 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif] sm:p-6">
      <div className="mb-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
          Clan settings
        </h2>

        <p className="mt-1 text-[13px] text-[#6e6e73]">
          Update how your clan appears to members.
        </p>
      </div>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="settings-name" className={labelClass}>
              Name
            </label>
            <span className="text-[12px] text-[#6e6e73]">{name.length}/80</span>
          </div>

          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            disabled={saving}
            placeholder="Clan name"
            className={fieldClass}
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="settings-description" className={labelClass}>
              Description
            </label>
            <span className="text-[12px] text-[#6e6e73]">
              {description.length}/10000
            </span>
          </div>

          <textarea
            id="settings-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={10000}
            rows={5}
            disabled={saving}
            placeholder="What is this clan about?"
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
                  disabled={saving}
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

        {/* Message */}
        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`rounded-[12px] border px-4 py-3 text-[14px] ${
              message.type === "error"
                ? "border-[#ff3b30]/30 bg-[#ff3b30]/5 text-[#d70015]"
                : "border-[#34c759]/30 bg-[#34c759]/5 text-[#248a3d]"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-[8px] bg-[#1d1d1f] px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}