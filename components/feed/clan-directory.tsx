"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Users } from "lucide-react";

import ClanJoinButton from "@/components/feed/clan-join-button";
import FeedModeSwitch from "@/components/feed/feed-mode-switch";
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

export default function ClanDirectory({ archivedClanIds = [], clans, hasAnyClans, memberClanIds, currentUserId, query = "", loadError = false }: { archivedClanIds?: string[]; clans: ClanSummary[]; hasAnyClans: boolean; memberClanIds: string[]; currentUserId: string; query?: string; loadError?: boolean }) {
  const memberSet = new Set(memberClanIds);
  const normalizedQuery = query.trim().toLowerCase();
  const archivedSet = new Set(archivedClanIds);
  const matchingClans = clans.filter((clan) => !normalizedQuery || `${clan.name} ${clan.description}`.toLowerCase().includes(normalizedQuery));
  const myClans = matchingClans.filter((clan) => memberSet.has(clan.id));
  const discoverableClans = matchingClans.filter((clan) => clan.visibility === "public" && !memberSet.has(clan.id));
  const hasPublicClans = clans.some((clan) => clan.visibility === "public");

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      <FeedModeSwitch active="clans" query={query} />
      <div className={styles.clanIntroLayout}>
        <header className={styles.clanIntro}>
          <p className="text-[12px] font-medium uppercase tracking-[.12em] text-[#6e6e73]">Your community</p>
          <h1 className="mt-2 text-[38px] font-semibold leading-[1.05] tracking-[-.05em] text-[#1d1d1f] sm:text-[48px]">Ideas grow when shared.</h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-[#6e6e73]">Find a Clan to build with, or create a space around an idea you care about.</p>
        </header>
        <aside className={`${styles.myClans} sabha-surface`} aria-label="Your Clans">
          <div className={styles.myClansHeading}><div><span>Your space</span><h2>Your Clans</h2></div><span className={styles.myClanCount}>{myClans.length}</span></div>
          {myClans.length ? (
            <ul className={styles.myClanList}>
              {myClans.map((clan) => (
                <li key={clan.id}>
                  <Link href={`/feed/clans/${clan.slug}`} className={styles.myClanLink}>
                    <span className={styles.myClanMark}>{clan.avatar_url ? <Image src={clan.avatar_url} alt="" width={36} height={36} unoptimized referrerPolicy="no-referrer" /> : clan.name.slice(0, 1).toUpperCase()}</span>
                    <span className={styles.myClanText}><strong>{clan.name}</strong><small>{clan.created_by === currentUserId ? "Created by you" : "Joined"} · {archivedSet.has(clan.id) ? "Archived" : clan.visibility}</small></span>
                    <ArrowUpRight size={15} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.myClansEmpty}><p>{normalizedQuery ? "No joined Clans match this search." : "Clans you create or join will appear here."}</p></div>
          )}
        </aside>
      </div>

      {loadError ? (
        <section className={`${styles.notice} sabha-surface`} role="alert">
          <strong>Clans need their database setup.</strong>
          <p>Apply the Sabha Clans migration, then refresh this page.</p>
        </section>
      ) : discoverableClans.length ? (
        <div className={styles.clanGrid}>
          {discoverableClans.map((clan) => (
            <article className={`${styles.clanCard} sabha-surface`} key={clan.id}>
              <div className={styles.clanCardTop}>
                <span className={styles.clanMark} aria-hidden="true">
                  {clan.avatar_url ? <Image src={clan.avatar_url} alt="" width={44} height={44} unoptimized referrerPolicy="no-referrer" /> : clan.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <h2>{clan.name}</h2>
              <span className="mt-1 text-[11px] font-medium text-[#6e6e73]">Public · open to join</span>
              <p>{clan.description || "A Sabha Clan for people to build and learn together."}</p>
              <div className={styles.clanCardFooter}>
                <span><Users size={15} /> {clan.member_count} {clan.member_count === 1 ? "member" : "members"}</span>
                <div className="flex items-center gap-3">
                  {archivedSet.has(clan.id) ? <span className="text-[12px] text-[#6e6e73]">Archived</span> : <ClanJoinButton clanId={clan.id} isMember={false} compact />}
                  <Link href={`/feed/clans/${clan.slug}`} aria-label={`Open ${clan.name}`}>
                    Open <ArrowUpRight size={15} />
                  </Link>
                  </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className={`${styles.empty} sabha-surface`}>
          <div className={styles.emptyIcon}><Users size={20} /></div>
          {normalizedQuery && matchingClans.length === 0 ? (
            <>
              <h3>No Clans match this search.</h3>
              <p>Try a different name or description.</p>
            </>
          ) : matchingClans.length > 0 || hasPublicClans ? (
            <>
              <h3>You’re caught up.</h3>
              <p>You’ve joined every public Clan matching this view. Your Clans are listed beside the introduction.</p>
            </>
          ) : (
            <>
              <h3>No public Clans yet.</h3>
              <p>Start a space for your project or community, then invite people to build alongside you.</p>
              {!hasAnyClans && <Link href="/feed/clans/new" className="sabha-button sabha-button-primary">Create the first Clan</Link>}
            </>
          )}
        </section>
      )}
    </div>
  );
}
