"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, ShieldAlert, Settings2, Users, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ClanJoinRequests, { type ClanJoinRequest } from "./clan-join-requests";
import settingsStyles from "./clan-settings.module.css";
import ProfileAvatar from "@/components/profile/ProfileAvatar";

export interface ClanMemberSummary {
  user_id: string;
  role: "owner" | "admin" | "moderator" | "member";
  name: string;
  username: string;
  avatar_url: string | null;
}

interface PendingClanInvite {
  id: string;
  username: string | null;
  name: string | null;
  created_at: string;
}

interface ClanInviteCandidate {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

const DESCRIPTION_WORD_LIMIT = 200;
// Keep the source limit friendly for phone photos while keeping the final request
// comfortably below Vercel's function payload limit, including multipart overhead.
const MAX_SOURCE_AVATAR_BYTES = 50 * 1024 * 1024;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

async function resizeClanAvatar(file: File) {
  // Some operating systems provide an empty MIME type for otherwise valid
  // image files, so use the filename as a fallback and let the browser decode it.
  const looksLikeImage = file.type.startsWith("image/") || /\.(avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(file.name);
  if (!looksLikeImage) throw new Error("Choose an image file.");
  if (file.size > MAX_SOURCE_AVATAR_BYTES) throw new Error("Choose an image that is 50 MB or smaller.");
  if (file.size === 0) throw new Error("This image file is empty.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image format can’t be opened by your browser. Try a common image such as PNG, JPEG, or WebP.");
  }
  try {
    // Encode all browser-readable source formats to one compact, predictable
    // avatar format. Alpha is composited onto white for the JPEG output.
    const maxDimensions = [512, 448, 384, 320, 256, 192, 160];
    const qualities = [0.86, 0.76, 0.66, 0.56, 0.46, 0.38];
    let output: Blob | null = null;

    for (const maxDimension of maxDimensions) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This image couldn’t be resized in your browser.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of qualities) {
        output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (output?.type === "image/jpeg" && output.size <= MAX_AVATAR_BYTES) break;
      }
      if (output?.type === "image/jpeg" && output.size <= MAX_AVATAR_BYTES) break;
    }

    if (!output || output.type !== "image/jpeg" || output.size > MAX_AVATAR_BYTES) {
      throw new Error("Your browser couldn’t create an optimized avatar from this image. Try another image format.");
    }
    return new File([output], "clan-avatar.jpg", { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
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
  pendingInvites = [],
  controlsReady = false,
  archived = false,
  initialSection,
  joinRequests = [],
  requestsReady = false,
}: {
  clanId: string;
  clanName: string;
  clanDescription: string;
  clanVisibility: "public" | "private";
  clanAvatarUrl: string | null;
  members: ClanMemberSummary[];
  currentUserId: string;
  currentRole: ClanMemberSummary["role"];
  pendingInvites?: PendingClanInvite[];
  controlsReady?: boolean;
  archived?: boolean;
  initialSection?: string;
  joinRequests?: ClanJoinRequest[];
  requestsReady?: boolean;
}) {
  const router = useRouter();
  const [section, setSection] = useState<"general" | "members" | "invitations" | "requests" | "danger">(initialSection === "members" || initialSection === "invitations" || initialSection === "requests" || (initialSection === "danger" && currentRole === "owner") ? initialSection : "general");
  const [dangerAction, setDangerAction] = useState<"transfer" | "archive" | "delete" | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [successor, setSuccessor] = useState("");
  const [username, setUsername] = useState("");
  const [selectedInvitee, setSelectedInvitee] = useState<ClanInviteCandidate | null>(null);
  const [inviteMatches, setInviteMatches] = useState<ClanInviteCandidate[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [name, setName] = useState(clanName);
  const [description, setDescription] = useState(clanDescription);
  const [visibility, setVisibility] = useState(clanVisibility);
  const [avatarUrl, setAvatarUrl] = useState(clanAvatarUrl ?? "");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingClan, setDeletingClan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  useEffect(() => {
    const query = username.trim().replace(/^@/, "");
    if (!canManage || selectedInvitee || query.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/feed/clans/member-search?clanId=${encodeURIComponent(clanId)}&q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = await response.json() as { members?: ClanInviteCandidate[]; error?: string };
          if (!response.ok) throw new Error(payload.error || "Member search is temporarily unavailable.");
          if (!controller.signal.aborted) setInviteMatches(payload.members ?? []);
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) return;
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
    if (countWords(description) > DESCRIPTION_WORD_LIMIT) {
      setError("Clan descriptions must be 200 words or fewer.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: settingsError } = await supabase.from("clans").update({
      name: name.trim(),
      description: description.trim(),
      visibility,
    }).eq("id", clanId);
    if (settingsError) setError(settingsError.code === "23514" ? "Clan descriptions must be 200 words or fewer." : "Clan settings couldn’t be saved. Please try again.");
    else {
      setError("Clan settings saved.");
      router.refresh();
    }
    setBusy(false);
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const compressed = await resizeClanAvatar(file);
      const formData = new FormData();
      formData.set("clanId", clanId);
      formData.set("file", compressed);
      const response = await fetch("/api/feed/clans/avatar", { method: "POST", body: formData });
      const payload = await response.json() as { avatarUrl?: string; error?: string };
      if (!response.ok || !payload.avatarUrl) throw new Error(payload.error || "The Clan image couldn’t be saved.");
      setAvatarUrl(payload.avatarUrl);
      setError("Clan image updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Clan image couldn’t be saved.");
    } finally {
      setBusy(false);
    }
  };

  const deleteClan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwner || deleteConfirmation.trim() !== clanName) return;
    setDeletingClan(true);
    setError(null);
    try {
      const response = await fetch(`/api/feed/clans/${encodeURIComponent(clanId)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(payload.error || "The Clan couldn’t be deleted.");
      router.replace(payload.redirectTo || "/feed?view=clans");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Clan couldn’t be deleted. Please try again.");
      setDeletingClan(false);
    }
  };

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInvitee || archived) return;
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

  const revokeInvite = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const { error: revokeError } = await createClient().rpc("revoke_clan_invite", { p_clan_id: clanId, p_invite_id: id });
      if (revokeError) throw new Error("This invitation couldn’t be revoked. Refresh and try again.");
      setError("Invitation revoked.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invitation couldn’t be revoked.");
    } finally { setBusy(false); }
  };

  const runOwnerAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwner || !controlsReady || confirmation !== clanName || !dangerAction || dangerAction === "delete") return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = dangerAction === "transfer"
        ? await supabase.rpc("transfer_clan_ownership", { p_clan_id: clanId, p_user_id: successor, p_confirmation: confirmation })
        : await supabase.rpc("set_clan_archived", { p_clan_id: clanId, p_archived: !archived, p_confirmation: confirmation });
      if (result.error) throw new Error(["42501", "22023"].includes(result.error.code) ? result.error.message : "The Clan couldn’t be updated. Refresh and try again.");
      setError(dangerAction === "transfer" ? "Ownership transferred. You are now an admin." : archived ? "Clan restored." : "Clan archived.");
      setDangerAction(null);
      setConfirmation("");
      if (dangerAction === "transfer") setSection("general");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Clan couldn’t be updated.");
    } finally { setBusy(false); }
  };

  return (
    <div className={settingsStyles.workspace}>
      <nav aria-label="Clan settings" className={settingsStyles.navigation}>
        <p className={settingsStyles.navigationLabel}>Clan settings</p>
        {([{ id: "general", label: "General" }, { id: "members", label: `Members · ${members.length}` }, { id: "invitations", label: `Invitations · ${pendingInvites.length}` }, { id: "requests", label: `Join requests · ${joinRequests.length}` }, ...(isOwner ? [{ id: "danger", label: "Danger zone" }] : [])] as {id: typeof section; label: string}[]).map((item) => (
          <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} disabled={busy || deletingClan} onClick={() => { setSection(item.id); setError(null); setDangerAction(null); }} className={settingsStyles.navigationButton}>{item.id === "general" ? <Settings2 size={15} /> : item.id === "members" ? <Users size={15} /> : (item.id === "invitations" || item.id === "requests") ? <Mail size={15} /> : <ShieldAlert size={15} />}<span>{item.id === "members" ? "Members" : item.id === "invitations" ? "Invitations" : item.id === "requests" ? "Join requests" : item.label}</span>{(item.id === "members" || item.id === "invitations" || item.id === "requests") && <span className={settingsStyles.count}>{item.id === "members" ? members.length : item.id === "requests" ? joinRequests.length : pendingInvites.length}</span>}</button>
        ))}
      </nav>
      <section className={settingsStyles.content} aria-label="Clan management">
        {!controlsReady && <p role="alert" className="mb-5 rounded-lg border border-[#d1d5db] p-4 text-[13px] text-red-600">Some management controls are temporarily unavailable. Existing settings and member controls remain available.</p>}
        {error && <p className={`mb-5 rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[13px] ${/saved\.|sent\.|updated\.|revoked\.|restored\.|archived\.|now an admin\.$/.test(error) ? "text-[#424245]" : "text-red-600"}`} role="status">{error}</p>}
      {canManage && section === "requests" && <section><h2 className={settingsStyles.sectionTitle}>Join requests</h2><ClanJoinRequests clanId={clanId} requests={joinRequests} ready={requestsReady} archived={archived} /></section>}
      {canManage && section === "general" && (
        <section className={settingsStyles.general}>
          <h2>General</h2>
          <form onSubmit={(event) => void saveSettings(event)} className="grid gap-4 border-t border-[#e8e8ed] p-4">
            <label className="grid gap-2 text-[12px] font-medium text-[#424245]">Name<input className="sabha-field h-10 px-3 text-[13px]" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required /></label>
            <label className="grid gap-2 text-[12px] font-medium text-[#424245]">
              <span className="flex items-center justify-between gap-3">Description <span className="font-normal text-[#8a8a8f]">{countWords(description)} / {DESCRIPTION_WORD_LIMIT} words</span></span>
              <textarea
                className="sabha-field min-h-[112px] max-h-[180px] resize-none overflow-y-auto px-3 py-2.5 text-[13px] leading-5"
                value={description}
                rows={4}
                onChange={(event) => { if (countWords(event.target.value) <= DESCRIPTION_WORD_LIMIT) setDescription(event.target.value); }}
                maxLength={3000}
                aria-describedby={`clan-description-limit-${clanId}`}
              />
              <span id={`clan-description-limit-${clanId}`} className="font-normal text-[#8a8a8f]">Keep the description clear and under 200 words.</span>
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#e5e5ea] bg-[#f5f8fc] text-[20px] font-semibold text-[#0071e3]">
                {avatarUrl ? <Image src={avatarUrl} alt={`${clanName} avatar`} width={56} height={56} unoptimized className="h-full w-full object-cover" /> : clanName.trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="grid gap-1.5">
                <label className="sabha-button inline-flex w-fit cursor-pointer items-center gap-2">
                  <ImagePlus size={15} />
                  {busy ? "Working…" : "Upload image"}
                  <input className="sr-only" type="file" accept="image/*" disabled={busy} onChange={(event) => { void uploadAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                </label>
                <span className="text-[11px] leading-4 text-[#8a8a8f]">PNG, JPG, JPEG, WebP, and other browser-readable images up to 50 MB are optimized on your device.</span>
              </div>
            </div>
            <label className="grid gap-2 text-[12px] font-medium text-[#424245]">Visibility<select className="sabha-field h-10 px-3 text-[13px]" value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")}><option value="public">Public · anyone can discover and join</option><option value="private">Private · members only, invite required</option></select></label>
            <div><button className="sabha-button sabha-button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></div>
          </form>
        </section>
      )}

      {canManage && section === "invitations" && (
        <section><h2 className={settingsStyles.sectionTitle}>Invitations</h2><p className="mt-0 text-[13px] text-[#6e6e73]">Invite members by username and manage pending invitations.</p>
        {archived && <p className="text-[13px] text-[#6e6e73]">Restore this Clan before inviting new members.</p>}
        <form onSubmit={(event) => void invite(event)} className="mt-5 flex flex-col gap-2 border-y border-[#e8e8ed] py-4 sm:flex-row sm:items-start">
          <div className="relative min-w-0 flex-1">
            <input
              className="sabha-field h-11 w-full px-3 text-[13px]"
              value={username}
              onChange={(event) => { setUsername(event.target.value); setSelectedInvitee(null); setInviteMatches([]); setSearchError(null); setSearchingMembers(event.target.value.trim().replace(/^@/, "").length >= 2); }}
              placeholder="Search Sabha usernames"
              aria-label="Search Sabha usernames to invite"
              disabled={archived || busy}
              role="combobox"
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
                    onClick={() => { setSelectedInvitee(candidate); setUsername(candidate.username); setInviteMatches([]); setSearchError(null); setSearchingMembers(false); }}
                  >
                    <ProfileAvatar name={candidate.name} avatarUrl={candidate.avatarUrl} size="small" />
                    <span className="min-w-0"><strong className="block truncate text-[12px] font-medium text-[#1d1d1f]">{candidate.name}</strong><span className="block truncate text-[11px] text-[#6e6e73]">@{candidate.username}</span></span>
                  </button>
                )) : <p className="m-0 px-3 py-2.5 text-[12px] text-[#6e6e73]">No matching members available to invite.</p>}
              </div>
            )}
            {selectedInvitee && <p className="mb-0 mt-1.5 text-[11px] text-[#277143]" role="status">Selected @{selectedInvitee.username}</p>}
          </div>
          <button className="sabha-button sabha-button-primary shrink-0" type="submit" disabled={busy || !selectedInvitee || archived}>{busy ? "Working…" : "Send invite"}</button>
        </form>
        <div className="mt-5 overflow-hidden rounded-xl border border-[#d1d5db] bg-white">
          <h3 className="m-0 border-b border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3 text-[13px] font-medium">Pending invitations</h3>
          {controlsReady && !pendingInvites.length && <p className="m-0 p-5 text-[13px] text-[#6e6e73]">No pending invitations.</p>}
          <ul className="m-0 list-none divide-y divide-[#e5e5ea] p-0">{pendingInvites.map((invitation) => <li key={invitation.id} className="flex items-center justify-between gap-3 px-4 py-4">
            <div className="min-w-0"><strong className="block truncate text-[13px] font-medium">{invitation.name || invitation.username || "Community member"}</strong><span className="text-[12px] text-[#6e6e73]">@{invitation.username || "member"} · Sent <time dateTime={invitation.created_at}>{invitation.created_at.slice(0, 10)}</time></span></div>
            <button type="button" className="sabha-button text-[#b42318]" disabled={busy || !controlsReady} onClick={() => void revokeInvite(invitation.id)}>Revoke</button>
          </li>)}</ul>
        </div></section>
      )}


      {section === "members" && <section><h2 className={settingsStyles.sectionTitle}>Members</h2><p className="mt-0 text-[13px] text-[#6e6e73]">Manage access and roles in your Clan.</p>
      <ul className="m-0 mt-5 grid list-none divide-y divide-[#e5e5ea] overflow-hidden rounded-xl border border-[#d1d5db] bg-white p-2">
        {members.map((member) => (
          <li key={member.user_id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-[12px] px-2 py-3">
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
      {canManage && <p className="mb-0 mt-3 text-[11px] leading-5 text-[#8a8a8f]">Admins can invite members and moderate posts. Only the owner can assign or remove admins.</p>}</section>}

      {isOwner && section === "danger" && (
        <section className={settingsStyles.danger} aria-label="Danger zone">
          <h2 className="mb-2 mt-0 flex items-center gap-2 text-[21px] font-semibold"><ShieldAlert size={19} /> Danger zone</h2>
          <p className="mb-5 mt-0 text-[13px] text-[#6e6e73]">These actions change ownership, availability, or permanently remove this Clan.</p>
          <div className="divide-y divide-[#f0c8c5] rounded-lg border border-[#f0c8c5]">
            {[{ id: "transfer", title: "Transfer ownership", description: "Choose an existing member as the new owner. You’ll remain an admin.", button: "Transfer ownership" }, { id: "archive", title: archived ? "Restore this Clan" : "Archive this Clan", description: "Preserve posts and members. An archived Clan cannot receive new posts, replies, joins, or invitations.", button: archived ? "Restore Clan" : "Archive Clan" }, { id: "delete", title: "Delete this Clan", description: "Permanently delete this Clan, its posts, replies, comments, members, and invitations.", button: "Delete Clan" }].map((action) => <div key={action.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1"><h3 className="m-0 text-[14px] font-semibold">{action.title}</h3><p className="mb-0 mt-1 text-[12px] leading-5 text-[#6e6e73]">{action.description}</p></div>
              <button type="button" className="sabha-button text-[#b42318]" disabled={busy || deletingClan || (action.id !== "delete" && !controlsReady)} onClick={() => { setDangerAction(action.id as typeof dangerAction); setConfirmation(""); setDeleteConfirmation(""); }}>{action.button}</button>
            </div>)}
          </div>
          {dangerAction && <div className="mt-5 rounded-lg border border-[#d1d5db] bg-[#f6f8fa] p-4">
            <button type="button" disabled={busy || deletingClan} className="float-right text-[12px] text-[#6e6e73] hover:underline" onClick={() => setDangerAction(null)}>Cancel</button>
            <h3 className="mb-4 mt-0 text-[14px] font-semibold">Confirm {dangerAction === "archive" && archived ? "restore" : dangerAction}</h3>
            {dangerAction !== "delete" && <form onSubmit={(event) => void runOwnerAction(event)} className="grid gap-4">
              {dangerAction === "transfer" && <label className="grid gap-2 text-[12px] font-medium">New owner<select className="sabha-field h-10 px-3 text-[13px]" required value={successor} onChange={(event) => setSuccessor(event.target.value)}><option value="">Choose a Clan member</option>{members.filter((member) => member.role !== "owner").map((member) => <option key={member.user_id} value={member.user_id}>@{member.username} — {member.name}</option>)}</select></label>}
              <label className="grid gap-2 text-[12px] font-medium">Type {clanName} to confirm<input className="sabha-field h-10 px-3 text-[13px]" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required /></label>
              <button type="submit" className="sabha-button w-fit text-[#b42318]" disabled={busy || confirmation !== clanName || (dangerAction === "transfer" && !successor)}>{busy ? "Updating…" : "Confirm change"}</button>
            </form>}
            {dangerAction === "delete" && (
          <form onSubmit={(event) => void deleteClan(event)} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1.5 text-[11px] font-medium text-[#424245]">Type <span className="font-semibold">{clanName}</span> to confirm
              <input className="sabha-field h-10 px-3 text-[13px]" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" />
            </label>
            <button className="sabha-button border-[#b42318] text-[#b42318] hover:bg-[#fff5f4]" type="submit" disabled={deletingClan || deleteConfirmation.trim() !== clanName}>{deletingClan ? "Deleting…" : "Delete Clan"}</button>
          </form>)}
          </div>}
        </section>
      )}
    </section>
    </div>
  );
}
