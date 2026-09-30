"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


type PostType = "conversation" | "project";
type Screenshot = { file: File; preview: string };

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#6e6e73]";
const fieldClass =
  "w-full rounded-[12px] border border-[#d2d2d7] bg-white px-4 py-3 text-[16px] text-[#1d1d1f] outline-none transition-colors placeholder:text-[#6e6e73] focus:border-[#0071e3] disabled:opacity-60";

export default function NewFeedPost({
  userId,
  clanId,
}: {
  userId: string;
  clanId?: string;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const screenshotInput = useRef<HTMLInputElement>(null);
  const readmeInput = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<PostType>("conversation");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [readme, setReadme] = useState<File | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScreenshots = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (screenshotInput.current) screenshotInput.current.value = "";
    if (!files.length) return;

    if (files.some((f) => !f.type.startsWith("image/"))) {
      setError("Only image files can be used as screenshots.");
      return;
    }

    setError(null);
    const selected = files.slice(0, 5 - screenshots.length);
    setScreenshots((cur) => [
      ...cur,
      ...selected.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeScreenshot = (index: number) => {
    URL.revokeObjectURL(screenshots[index].preview);
    setScreenshots((cur) => cur.filter((_, i) => i !== index));
  };

  const handleReadme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".md") && name !== "readme") {
      setError("Please upload a README.md file.");
      return;
    }

    setError(null);
    setReadme(file);
  };

  const uploadFile = async (file: File, feedItemId: string) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${feedItemId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("feed-assets")
      .upload(path, file, { upsert: false });

    if (error) throw new Error(error.message);
    return path;
  };

  const addAttachment = async (
    feedItemId: string,
    kind: "screenshot" | "readme",
    file: File,
    sortOrder: number
  ) => {
    const path = await uploadFile(file, feedItemId);

    const { error } = await supabase.from("feed_attachments").insert({
      feed_item_id: feedItemId,
      type: kind,
      url: path,
      name: file.name,
      sort_order: sortOrder,
    });

    if (error) throw new Error(error.message);
  };

  const handlePublish = async () => {
    if (publishing) return;
    setError(null);

    if (type === "conversation" && !content.trim()) {
      setError("Write something before posting.");
      return;
    }

    if (type === "project" && !title.trim()) {
      setError("Give your project a title.");
      return;
    }

    setPublishing(true);
    let feedItemId: string | null = null;

    try {
      const { data: feedItem, error: feedError } = await supabase
        .from("feed_items")
        .insert({ author_id: userId, type, clan_id: clanId ?? null })
        .select("id")
        .single();

      if (feedError || !feedItem) {
        throw new Error(feedError?.message ?? "Failed to create post.");
      }

      feedItemId = feedItem.id;

      if (type === "conversation") {
        const { error } = await supabase
          .from("conversations")
          .insert({ id: feedItem.id, content: content.trim() });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("projects").insert({
          id: feedItem.id,
          title: title.trim(),
          description: description.trim() || null,
          project_url: projectUrl.trim() || null,
        });
        if (error) throw new Error(error.message);

        for (let i = 0; i < screenshots.length; i++) {
          await addAttachment(feedItem.id, "screenshot", screenshots[i].file, i);
        }

        if (readme) {
          await addAttachment(feedItem.id, "readme", readme, 0);
        }
      }

      screenshots.forEach((s) => URL.revokeObjectURL(s.preview));
      router.push(clanId ? `/clans/${clanId}` : "/feed");
      router.refresh();
    } catch (err) {
      // Don't leave a half-created post behind
      if (feedItemId) {
        await supabase.from("feed_items").delete().eq("id", feedItemId);
      }
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPublishing(false);
    }
  };

  const backHref = clanId ? `/clans/${clanId}` : "/feed";

  return (
    <main className="min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
        <Link href={backHref} className="text-[14px] text-[#0066cc] hover:underline">
          ← Back to {clanId ? "clan" : "feed"}
        </Link>

        <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[40px]">
          Create.
        </h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">
          {clanId ? "Share something with this clan." : "Share something with Sabha."}
        </p>

        <div className="mt-6 space-y-5 rounded-[18px] bg-white p-5 sm:p-8">
          {/* Type switch */}
          <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-[#f5f5f7] p-1">
            {(["conversation", "project"] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={publishing}
                onClick={() => {
                  setType(t);
                  setError(null);
                }}
                className={`rounded-[9px] px-4 py-2.5 text-[15px] font-medium capitalize transition ${
                  type === t
                    ? "bg-white text-[#1d1d1f] shadow-sm"
                    : "text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {type === "conversation" ? (
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="content" className={labelClass}>
                  Conversation
                </label>
                <span className="text-[12px] text-[#6e6e73]">
                  {content.length}/10000
                </span>
              </div>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={10000}
                rows={10}
                autoFocus
                disabled={publishing}
                className={`${fieldClass} resize-y leading-7`}
              />
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="title" className={labelClass}>
                    Project name
                  </label>
                  <span className="text-[12px] text-[#6e6e73]">
                    {title.length}/150
                  </span>
                </div>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project name"
                  maxLength={150}
                  autoFocus
                  disabled={publishing}
                  className={fieldClass}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="description" className={labelClass}>
                    Description
                  </label>
                  <span className="text-[12px] text-[#6e6e73]">
                    {description.length}/10000
                  </span>
                </div>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you building?"
                  maxLength={10000}
                  rows={6}
                  disabled={publishing}
                  className={`${fieldClass} resize-y leading-7`}
                />
              </div>

              <div>
                <label htmlFor="url" className={labelClass}>
                  Project URL
                </label>
                <input
                  id="url"
                  type="url"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  placeholder="https://"
                  disabled={publishing}
                  className={fieldClass}
                />
              </div>

              {/* Screenshots */}
              <div>
                <div className="flex items-baseline justify-between">
                  <span className={labelClass}>Screenshots</span>
                  <span className="text-[12px] text-[#6e6e73]">
                    {screenshots.length}/5
                  </span>
                </div>

                <input
                  ref={screenshotInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleScreenshots}
                />

                <button
                  type="button"
                  onClick={() => screenshotInput.current?.click()}
                  disabled={publishing || screenshots.length >= 5}
                  className="w-full rounded-[12px] border border-dashed border-[#d2d2d7] px-4 py-5 text-[14px] text-[#6e6e73] transition hover:border-[#86868b] hover:text-[#1d1d1f] disabled:opacity-40"
                >
                  + Add screenshots
                </button>

                {screenshots.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {screenshots.map((s, i) => (
                      <div
                        key={s.preview}
                        className="group relative aspect-video overflow-hidden rounded-[10px] bg-[#f5f5f7]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(i)}
                          aria-label="Remove screenshot"
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white sm:opacity-0 sm:transition sm:group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* README */}
              <div>
                <span className={labelClass}>README</span>
                <input
                  ref={readmeInput}
                  type="file"
                  accept=".md"
                  hidden
                  onChange={handleReadme}
                />
                <button
                  type="button"
                  onClick={() => readmeInput.current?.click()}
                  disabled={publishing}
                  className="w-full rounded-[12px] border border-dashed border-[#d2d2d7] px-4 py-4 text-left text-[14px] text-[#6e6e73] transition hover:border-[#86868b] hover:text-[#1d1d1f]"
                >
                  {readme ? `📄 ${readme.name}` : "+ Attach README.md"}
                </button>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-[12px] border border-[#ff3b30]/30 bg-[#ff3b30]/5 px-4 py-3 text-[14px] text-[#d70015]"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Link
              href={backHref}
              aria-disabled={publishing}
              className={`rounded-[8px] border border-[#d2d2d7] px-5 py-2.5 text-center text-[15px] text-[#1d1d1f] hover:bg-[#f5f5f7] ${
                publishing ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="rounded-[8px] bg-[#1d1d1f] px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}