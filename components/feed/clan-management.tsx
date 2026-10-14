"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProfileAvatar from "@/components/profile/ProfileAvatar";

export interface ClanMemberSummary {
  user_id: string;
  role: "owner" | "admin" | "moderator" | "member";
  name: string;
  username: string;
  avatar_url: string | null;
}

interface ClanInviteCandidate {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export default function ClanManagement({
  clanId,
  clanName,
  clanDescription,
  clanVisibility,
  clanAvatarUrl,
  members,
  currentUserId,
  currentRole,
}: {
  clanId: string;
  clanName: string;
  clanDescription: string;
  clanVisibility: "public" | "private";
  clanAvatarUrl: string | null;
  members: ClanMemberSummary[];
  currentUserId: string;
  currentRole: ClanMemberSummary["role"];
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [selectedInvitee, setSelectedInvitee] = useState<ClanInviteCandidate | null>(null);
  const [inviteMatches, setInviteMatches] = useState<ClanInviteCandidate[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [name, setName] = useState(clanName);
  const [description, setDescription] = useState(clanDescription);
  const [visibility, setVisibility] = useState(clanVisibility);
  const [avatarUrl, setAvatarUrl] = useState(clanAvatarUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  useEffect(() => {
    const query = username.trim().replace(/^@/, "");
    if (!canManage || selectedInvitee || query.length < 2) {
      setInviteMatches([]);
      setSearchingMembers(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    setSearchingMembers(true);
    setSearchError(null);
    const timeout = window.setTimeout(() => {
      void fetch(`/api/feed/clans/member-search?clanId=${encodeURIComponent(clanId)}&q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = await response.json() as { members?: ClanInviteCandidate[]; error?: string };
          if (!response.ok) throw new Error(payload.error || "Member search is temporarily unavailable.");
          setInviteMatches(payload.members ?? []);
        })
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setInviteMatches([]);
          setSearchError(cause instanceof Error ? cause.message : "Member search is temporarily unavailable.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchingMembers(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [canManage, clanId, selectedInvitee, username]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: settingsError } = await supabase.from("clans").update({
      name: name.trim(),
      description: description.trim(),
      visibility,
      avatar_url: avatarUrl.trim() || null,
    }).eq("id", clanId);
    if (settingsError) setError("Clan settings couldn’t be saved. Check the avatar URL and try again.");
    else {
      setError("Clan settings saved.");
      router.refresh();
    }
    setBusy(false);
  };

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInvitee) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: inviteError } = await supabase.rpc("invite_to_clan", {
      p_clan_id: clanId,
      p_username: selectedInvitee.username,
    });
    if (inviteError) {
      const message = inviteError.message.toLowerCase();
      if (message.includes("no sabha member")) setError("No member matched that username.");
      else if (message.includes("already belongs")) setError("That person is already in this Clan.");
      else if (message.includes("already part") || message.includes("yourself")) setError("You’re already part of this Clan.");
      else setError("The invitation couldn’t be sent. Check the username and try again.");
      setBusy(false);
      return;
    }
    setUsername("");
    setSelectedInvitee(null);
    setInviteMatches([]);
    setError("Invitation sent.");
    setBusy(false);
    router.refresh();
  };

  const removeMember = async (member: ClanMemberSummary) => {
    if (!window.confirm(`Remove @${member.username} from this Clan?`)) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: removeError } = await supabase.rpc("remove_clan_member", { p_clan_id: clanId, p_user_id: member.user_id });
    if (removeError) setError("That member couldn’t be removed. Your role may not allow it.");
    else router.refresh();
    setBusy(false);
  };

  const changeRole = async (member: ClanMemberSummary, role: "admin" | "moderator" | "member") => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: roleError } = await supabase.rpc("set_clan_member_role", { p_clan_id: clanId, p_user_id: member.user_id, p_role: role });
    if (roleError) setError("Member role couldn’t be updated.");
    else router.refresh();
    setBusy(false);
  };

  return (
    <section className="mt-3 rounded-[18px] border border-[#e5e5ea] bg-white p-5 sm:p-7" aria-label="Clan members and management">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-[.12em] text-[#6e6e73]">Clan space</p>
          <h2 className="mt-1 text-[19px] font-semibold tracking-[-.02em] text-[#1d1d1f]">Members <span className="text-[13px] font-normal text-[#8a8a8f]">{members.length}</span></h2>
        </div>
        {canManage && <span className="rounded-full border border-[#e5e5ea] bg-[#f5f5f7] px-3 py-1 text-[11px] font-medium text-[#424245]">{currentRole}</span>}
      </header>

      {canManage && (
        <details className="mt-5 rounded-[12px] border border-[#e8e8ed]">
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium text-[#424245]">Clan settings</summary>
          <form onSubmit={(event) => void saveSettings(event)} className="grid gap-4 border-t border-[#e8e8ed] p-4">
            <label className="grid gap-2 text-[12px] font-medium text-[#424245]">Name<input className="sabha-field h-10 px-3 text-[13px]" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required /></label>
            <label className="grid gap-2 text-[12px] font-medium text-[#424245]">Description<textarea className="sabha-field min-h-20 resize-y px-3 py-2 text-[13px] leading-5" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></label>
            <label className="grid gap-2 text-[12px] font-medium text-[#424245]">Avatar URL<input className="sabha-field h-10 px-3 text-[13px]" type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} maxLength={2048} placeholder="https://…" /></label>
            <label className="grid gap-2 text-[12px] font-medium text-[#424245]">Visibility<select className="sabha-field h-10 px-3 text-[13px]" value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")}><option value="public">Public · anyone can discover and join</option><option value="private">Private · members only, invite required</option></select></label>
            <div><button className="sabha-button sabha-button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></div>
          </form>
        </details>
      )}

      {canManage && (
        <form onSubmit={(event) => void invite(event)} className="mt-5 flex flex-col gap-2 border-y border-[#e8e8ed] py-4 sm:flex-row sm:items-start">
          <div className="relative min-w-0 flex-1">
            <input
              className="sabha-field h-11 w-full px-3 text-[13px]"
              value={username}
              onChange={(event) => { setUsername(event.target.value); setSelectedInvitee(null); }}
              placeholder="Search Sabha usernames"
              aria-label="Search Sabha usernames to invite"
              aria-autocomplete="list"
              aria-controls={`clan-invite-options-${clanId}`}
              aria-expanded={username.trim().replace(/^@/, "").length >= 2 && !selectedInvitee}
              maxLength={40}
              autoComplete="off"
            />
            {username.trim().replace(/^@/, "").length >= 2 && !selectedInvitee && (
              <div id={`clan-invite-options-${clanId}`} className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-[12px] border border-[#e5e5ea] bg-white p-1.5 shadow-[0_12px_36px_rgba(20,25,35,.14)]" role="listbox" aria-label="Matching Sabha members">
                {searchingMembers ? <p className="m-0 px-3 py-2.5 text-[12px] text-[#6e6e73]">Searching members…</p> : searchError ? <p className="m-0 px-3 py-2.5 text-[12px] text-red-600" role="status">{searchError}</p> : inviteMatches.length ? inviteMatches.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left hover:bg-[#f5f5f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071e3]"
                    onClick={() => { setSelectedInvitee(candidate); setUsername(candidate.username); setInviteMatches([]); setSearchError(null); }}
                  >
                    <ProfileAvatar name={candidate.name} avatarUrl={candidate.avatarUrl} size="small" />
                    <span className="min-w-0"><strong className="block truncate text-[12px] font-medium text-[#1d1d1f]">{candidate.name}</strong><span className="block truncate text-[11px] text-[#6e6e73]">@{candidate.username}</span></span>
                  </button>
                )) : <p className="m-0 px-3 py-2.5 text-[12px] text-[#6e6e73]">No matching members available to invite.</p>}
              </div>
            )}
            {selectedInvitee && <p className="mb-0 mt-1.5 text-[11px] text-[#277143]" role="status">Selected @{selectedInvitee.username}</p>}
          </div>
          <button className="sabha-button sabha-button-primary shrink-0" type="submit" disabled={busy || !selectedInvitee}>{busy ? "Working…" : "Send invite"}</button>
        </form>
      )}

      {error && <p className={`mb-0 mt-3 text-[12px] ${error.endsWith("saved.") || error.endsWith("sent.") ? "text-[#277143]" : "text-red-600"}`} role="status">{error}</p>}

      <ul className="m-0 mt-3 grid list-none gap-1 p-0">
        {members.map((member) => (
          <li key={member.user_id} className="flex min-w-0 items-center gap-3 rounded-[12px] px-2 py-2">
            <ProfileAvatar name={member.name} avatarUrl={member.avatar_url} size="small" />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[13px] font-medium text-[#1d1d1f]">{member.name}</strong>
              <span className="text-[11px] text-[#6e6e73]">@{member.username} · {member.role}</span>
            </div>
            {isOwner && member.role !== "owner" && (
              <select className="sabha-field h-9 max-w-[120px] px-2 text-[11px]" value={member.role} aria-label={`Role for @${member.username}`} disabled={busy} onChange={(event) => void changeRole(member, event.target.value as "admin" | "moderator" | "member")}>
                <option value="admin">Admin</option><option value="moderator">Moderator</option><option value="member">Member</option>
              </select>
            )}
            {canManage && member.role !== "owner" && member.user_id !== currentUserId && (isOwner || member.role === "moderator" || member.role === "member") && (
              <button type="button" className="rounded-full px-2 py-1 text-[11px] text-[#b42318] hover:bg-[#fff1f0] disabled:opacity-50" disabled={busy} onClick={() => void removeMember(member)}>Remove</button>
            )}
          </li>
        ))}
      </ul>
      {canManage && <p className="mb-0 mt-3 text-[11px] leading-5 text-[#8a8a8f]">Admins can invite members and moderate posts. Only the owner can assign or remove admins.</p>}
    </section>
  );
}
