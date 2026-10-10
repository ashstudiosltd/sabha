"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import SabhaPostComposer, { type SabhaPostDraft, type SabhaPostType } from "@/components/sabha/post-composer";
import { createClient } from "@/lib/supabase/client";

interface FeedPostFormProps {
  authorId: string;
  authorName: string;
  authorUsername: string;
  postType: SabhaPostType;
  clanId?: string;
  clanSlug?: string;
  clanName?: string;
}

export default function FeedPostForm({ authorId, authorName, authorUsername, postType, clanId, clanSlug, clanName }: FeedPostFormProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(postType);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const feedUrl = clanSlug ? `/feed/clans/${clanSlug}` : `/feed?view=${selectedType}`;

  const changePostType = (type: SabhaPostType) => {
    setSelectedType(type);
    router.replace(`/feed/new?type=${type}${clanSlug ? `&clan=${encodeURIComponent(clanSlug)}` : ""}`, { scroll: false });
  };

  const publish = async (draft: SabhaPostDraft) => {
    setSubmitError(null);
    const supabase = createClient();
    const { error } = await supabase.from("feed_posts").insert({
      author_id: authorId,
      clan_id: clanId ?? null,
      post_type: draft.postType,
      title: draft.title,
      body: draft.body,
      resource_kind: draft.resourceKind,
      resource_url: draft.resourceUrl,
      resource_label: draft.resourceLabel,
    });

    if (error) {
      setSubmitError("Your post couldn’t be published. Please try again.");
      console.error("Unable to publish Feed post:", error.message);
      return false;
    }

    router.replace(clanSlug ? `/feed/clans/${clanSlug}` : `/feed?view=${draft.postType}`);
    router.refresh();
    return true;
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
      <Link href={feedUrl} className="text-[14px] text-[#0066cc] hover:underline">
        ← Back to Feed
      </Link>
      <header className="mt-7">
        <h1 className="m-0 text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#1d1d1f] sm:text-[40px]">New post</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#6e6e73]">Posting as <strong className="font-medium text-[#1d1d1f]">{authorName}</strong> · @{authorUsername}{clanName ? <> · Posting to <strong className="font-medium text-[#1d1d1f]">{clanName}</strong></> : null}</p>
      </header>
      <div className="mt-6">
        <SabhaPostComposer postType={selectedType} onPostTypeChange={changePostType} submitError={submitError} onPublish={publish} />
      </div>
    </div>
  );
}
