"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Users } from "lucide-react";

import ClanJoinButton from "@/components/feed/clan-join-button";
import styles from "./feed-experience.module.css";

export interface ClanSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  member_count: number;
  avatar_url: string | null;
  visibility: "public" | "private";
}

export default function ClanDirectory({ clans, memberClanIds, currentUserId, loadError = false }: { clans: ClanSummary[]; memberClanIds: string[]; currentUserId: string; loadError?: boolean }) {
  const memberSet = new Set(memberClanIds);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[.12em] text-[#6e6e73]">Build together</p>
          <h1 className="mt-2 text-[38px] font-semibold leading-[1.05] tracking-[-.05em] text-[#1d1d1f] sm:text-[48px]">Clans.</h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-[#6e6e73]">Small communities for people building, learning, and sharing around a common idea.</p>
        </div>
        <Link href="/feed/clans/new" className="sabha-button sabha-button-primary">Create a Clan</Link>
      </div>

      {loadError ? (
        <section className={`${styles.notice} sabha-surface`} role="alert">
          <strong>Clans need their database setup.</strong>
          <p>Apply the Sabha Clans migration, then refresh this page.</p>
        </section>
      ) : clans.length ? (
        <div className={styles.clanGrid}>
          {clans.map((clan) => {
            const isMember = memberSet.has(clan.id);
            return (
              <article className={`${styles.clanCard} sabha-surface`} key={clan.id}>
                <div className={styles.clanCardTop}>
                  <span className={styles.clanMark} aria-hidden="true">
                    {clan.avatar_url ? <Image src={clan.avatar_url} alt="" width={44} height={44} unoptimized referrerPolicy="no-referrer" /> : clan.name.slice(0, 1).toUpperCase()}
                  </span>
                  {isMember && <span className={styles.clanMemberBadge}>Member</span>}
                </div>
                <h2>{clan.name}</h2>
                <span className="mt-1 text-[11px] font-medium text-[#6e6e73]">{clan.visibility === "private" ? "Private · members only" : "Public · open to join"}</span>
                <p>{clan.description || "A Sabha Clan for people to build and learn together."}</p>
                <div className={styles.clanCardFooter}>
                  <span><Users size={15} /> {clan.member_count} {clan.member_count === 1 ? "member" : "members"}</span>
                  <div className="flex items-center gap-3">
                    {clan.visibility === "public" && <ClanJoinButton clanId={clan.id} isMember={isMember} isOwner={clan.created_by === currentUserId} compact />}
                    <Link href={`/feed/clans/${clan.slug}`} aria-label={`Open ${clan.name}`}>
                      Open <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className={`${styles.empty} sabha-surface`}>
          <div className={styles.emptyIcon}><Users size={20} /></div>
          <h3>The first Clan starts here.</h3>
          <p>Create a space for your project or community, then invite people to build alongside you.</p>
          <Link href="/feed/clans/new" className="sabha-button sabha-button-primary">Create the first Clan</Link>
        </section>
      )}
    </div>
  );
}
