"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Link2, MessageCircle, Share2, Trash2 } from "lucide-react";

import ShareSheet from "@/components/ShareSheet";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { createClient } from "@/lib/supabase/client";
import FeedLikeButton, { type FeedLikeSummary } from "./feed-like-button";
import FeedModeSwitch from "@/components/feed/feed-mode-switch";
import styles from "./feed-experience.module.css";

type PostType = "conversation" | "project";
type ResourceKind = "blog" | "project" | "github" | "readme" | "image" | "link";

interface FeedProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

interface FeedPost {
  id: string;
  author_id: string;
  clan_id: string | null;
  post_type: PostType;
  title: string | null;
  body: string;
  resource_kind: ResourceKind | null;
  resource_url: string | null;
  resource_label: string | null;
  created_at: string;
  author: FeedProfile;
  replies: FeedReply[];
  comments: FeedComment[];
}

interface FeedReply {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: FeedProfile;
}

interface FeedComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: FeedProfile;
}

interface FeedExperienceProps {
  currentProfile: FeedProfile;
  activeView: PostType | "all";
  canParticipate?: boolean;
  canModerate?: boolean;
  initialPosts: FeedPost[];
  initialHasMore?: boolean;
  initialCursor?: { createdAt: string; id: string } | null;
  searchQuery?: string;
  loadError: "setup" | "load" | null;
}

function formatUtcDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()];
  const hour = date.getUTCHours();
  const clockHour = hour % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const period = hour < 12 ? "AM" : "PM";
  return `${month} ${date.getUTCDate()} at ${clockHour}:${minutes} ${period} UTC`;
}

function formatLocalDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function subscribeToLocaleChange() {
  return () => {};
}

function FeedTimestamp({ value }: { value: string }) {
  const date = useSyncExternalStore(
    subscribeToLocaleChange,
    () => formatLocalDate(value),
    () => formatUtcDate(value),
  );

  return <time dateTime={value}>{date}</time>;
}

export default function FeedExperience({ currentProfile, activeView, canParticipate = true, canModerate = false, initialPosts, initialHasMore = false, initialCursor, searchQuery = "", loadError }: FeedExperienceProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [likeSummaries, setLikeSummaries] = useState<Record<string, FeedLikeSummary>>({});
  const likePostIds = posts.map((post) => post.id).join(",");
  useEffect(() => {
    if (!likePostIds) return;
    let active = true;
    const supabase = createClient();
    void supabase.rpc("get_feed_like_summaries", { p_post_ids: likePostIds.split(",").slice(-100) }).then(({ data, error }) => {
      if (!active || error) return;
      const summaries = Object.fromEntries((data ?? []).map((item: FeedLikeSummary & { post_id: string }) => [item.post_id, item]));
      setLikeSummaries((current) => ({ ...current, ...summaries }));
    });
    return () => { active = false; };
  }, [likePostIds]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const cursor = useRef(initialCursor ?? (initialPosts.length ? { createdAt: initialPosts.at(-1)!.created_at, id: initialPosts.at(-1)!.id } : null));
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const replyFieldRef = useRef<HTMLTextAreaElement>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const [commentingTo, setCommentingTo] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentFieldRef = useRef<HTMLTextAreaElement>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ postId: string; message: string } | null>(null);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);

  const submitReply = async (postId: string) => {
    const cleanReply = replyText.trim();
    if (!cleanReply) return;
    setReplyBusy(true);
    setReplyError(null);
    const supabase = createClient();
    const { data, error: replyError } = await supabase.from("feed_replies").insert({
      post_id: postId,
      author_id: currentProfile.id,
      body: cleanReply,
    }).select("id, post_id, author_id, body, created_at").single();
    if (replyError) setReplyError(replyError.message);
    else {
      if (data) {
        const reply: FeedReply = { ...data, author: currentProfile };
        setPosts((current) => current.map((post) => post.id === postId ? { ...post, replies: [...post.replies, reply] } : post));
      }
      setReplyText("");
      setReplyingTo(null);
    }
    setReplyBusy(false);
  };

  const submitComment = async (postId: string) => {
    const cleanComment = commentText.trim();
    if (!cleanComment) return;
    setCommentBusy(true);
    setCommentError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase.from("feed_comments").insert({
      post_id: postId,
      author_id: currentProfile.id,
      body: cleanComment,
    }).select("id, post_id, author_id, body, created_at").single();

    if (insertError) setCommentError(insertError.message);
    else if (data) {
      const comment: FeedComment = { ...data, author: currentProfile };
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...post.comments, comment] } : post));
      setCommentText("");
      setCommentingTo(null);
    }
    setCommentBusy(false);
  };

  const deletePost = async (postId: string) => {
    setDeletingId(postId);
    setDeleteError(null);
    const supabase = createClient();
    const { data, error: deleteFailure } = await supabase
      .from("feed_posts")
      .delete()
      .eq("id", postId)
      .select("id")
      .maybeSingle();

    if (deleteFailure || !data) {
      setDeleteError({ postId, message: "This post couldn’t be deleted. Please try again." });
      setDeletingId(null);
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== postId));
    setReplyingTo((current) => current === postId ? null : current);
    setConfirmingDelete(null);
    setDeletingId(null);
  };

  const query = searchQuery.trim().toLowerCase();
  const visiblePosts = posts
    .filter((post) => activeView === "all" || post.post_type === activeView)
    .filter((post) => !query || [post.title, post.body, post.author.name, post.author.username].some((value) => value?.toLowerCase().includes(query)));
  const sharingPost = visiblePosts.find((post) => post.id === sharingPostId) ?? null;

  const loadOlderPosts = async () => {
    if (!hasMore || loadingMore || !cursor.current || (activeView !== "conversation" && activeView !== "project")) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const params = new URLSearchParams({ view: activeView, after: cursor.current.createdAt, id: cursor.current.id });
      const response = await fetch(`/api/feed/posts?${params}`, { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.posts)) throw new Error(result.error || "Older posts couldn’t be loaded. Please try again.");
      setPosts((current) => {
        const existing = new Set(current.map((post) => post.id));
        return [...current, ...(result.posts as FeedPost[]).filter((post) => !existing.has(post.id))];
      });
      if (result.nextCursor && typeof result.nextCursor.createdAt === "string" && typeof result.nextCursor.id === "string") {
        cursor.current = { createdAt: result.nextCursor.createdAt, id: result.nextCursor.id };
      }
      setHasMore(result.hasMore === true);
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : "Older posts couldn’t be loaded. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const field = replyFieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 220)}px`;
    field.style.overflowY = field.scrollHeight > 220 ? "auto" : "hidden";
  }, [replyText, replyingTo]);

  useEffect(() => {
    const field = commentFieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 180)}px`;
    field.style.overflowY = field.scrollHeight > 180 ? "auto" : "hidden";
  }, [commentText, commentingTo]);

  return (
    <div className={styles.layout}>
      <section className={styles.main} aria-label="Community Feed">
        {loadError === "setup" ? (
          <div className={styles.notice} role="status">
            <strong>Feed storage needs its first setup.</strong>
            <p>Apply the Feed migration in your Sabha Supabase project, then reload this page.</p>
          </div>
        ) : loadError === "load" ? (
          <div className={styles.notice} role="alert">
            <strong>Feed couldn’t load.</strong>
            <p>Refresh the page in a moment. Your account and profile are still connected.</p>
          </div>
        ) : (
          <>
            <div className={`${styles.feedHeading} ${activeView === "all" ? styles.feedHeadingNoMode : ""}`}>
              {activeView !== "all" && <FeedModeSwitch active={activeView} query={searchQuery} />}
              <h2>Recents.</h2>
              <span className={styles.postCount}>{visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"}</span>
            </div>

            {visiblePosts.length ? (
              <div className={styles.posts}>
                {visiblePosts.map((post) => (
                  <article id={`post-${post.id}`} className={`${styles.post} sabha-surface`} key={post.id}>
                    <div className={styles.postHeader}>
                      <ProfileAvatar name={post.author.name} avatarUrl={post.author.avatarUrl} size="large" />
                      <div className={styles.author}>
                        <strong>{post.author.name}</strong>
                        <span>@{post.author.username} · <FeedTimestamp value={post.created_at} /></span>
                      </div>
                      <span className={styles.postType}>{post.post_type === "project" ? "Project update" : "Conversation"}</span>
                    </div>
                    {post.title && <h3 className={styles.postTitle}>{post.title}</h3>}
                    <p className={styles.postBody}>{post.body}</p>
                    {post.resource_url && (
                      <a className={styles.resourceCard} href={post.resource_url} target={post.resource_url.startsWith("/") ? undefined : "_blank"} rel={post.resource_url.startsWith("/") ? undefined : "noreferrer"}>
                        <span className={styles.resourceIcon}><Link2 size={16} /></span>
                        <span><small>{post.resource_kind}</small><strong>{post.resource_label}</strong></span>
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                    <div className={styles.postFooter}>
                      <FeedLikeButton postId={post.id} userId={currentProfile.id} summary={likeSummaries[post.id]} disabled={!canParticipate} onChange={(summary) => setLikeSummaries((current) => ({ ...current, [post.id]: summary }))} />
                      {canParticipate && <>
                        <button type="button" onClick={() => { setReplyingTo(replyingTo === post.id ? null : post.id); setReplyText(""); setReplyError(null); }} className={styles.replyToggle}>
                          <MessageCircle size={15} /> {post.replies.length ? `Reply · ${post.replies.length}` : "Reply"}
                        </button>
                        <button type="button" onClick={() => { setCommentingTo(commentingTo === post.id ? null : post.id); setCommentText(""); setCommentError(null); }} className={styles.replyToggle}>
                          Comment · {post.comments.length}
                        </button>
                      </>}
                      <button type="button" onClick={() => setSharingPostId(post.id)} className={styles.shareToggle} aria-label="Share this Feed post">
                        <Share2 size={15} /> Share
                      </button>
                      {(post.author_id === currentProfile.id || canModerate) && (
                        <button
                          type="button"
                          className={styles.deleteToggle}
                          onClick={() => {
                            setDeleteError(null);
                            setConfirmingDelete(confirmingDelete === post.id ? null : post.id);
                          }}
                          aria-label={`Delete ${post.author_id === currentProfile.id ? "your" : "this"} post${post.title ? `: ${post.title}` : ""}`}
                          aria-expanded={confirmingDelete === post.id}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      )}
                    </div>
                    {confirmingDelete === post.id && (
                      <div className={styles.deleteConfirm} role="group" aria-label="Confirm post deletion">
                        <div>
                          <strong>Delete this post?</strong>
                          <p>This also removes its replies and comments. You can’t undo this.</p>
                          {deleteError?.postId === post.id && <p className={styles.deleteError} role="alert">{deleteError.message}</p>}
                        </div>
                        <div className={styles.deleteActions}>
                          <button type="button" className={styles.cancelDelete} onClick={() => { setConfirmingDelete(null); setDeleteError(null); }} disabled={deletingId === post.id}>Keep post</button>
                          <button type="button" className={styles.confirmDelete} onClick={() => void deletePost(post.id)} disabled={deletingId === post.id}>
                            {deletingId === post.id ? "Deleting…" : "Delete post"}
                          </button>
                        </div>
                      </div>
                    )}
                    {post.replies.length > 0 && (
                      <div className={styles.replies} aria-label="Replies">
                        {post.replies.map((reply) => (
                          <div className={styles.reply} key={reply.id}>
                            <ProfileAvatar name={reply.author.name} avatarUrl={reply.author.avatarUrl} size="small" />
                            <div className={styles.replyContent}>
                              <div className={styles.replyAuthor}><strong>{reply.author.name}</strong><span><FeedTimestamp value={reply.created_at} /></span></div>
                              <p>{reply.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {post.comments.length > 0 && (
                      <div className={styles.comments} aria-label="Comments">
                        {post.comments.map((comment) => (
                          <div className={styles.reply} key={comment.id}>
                            <ProfileAvatar name={comment.author.name} avatarUrl={comment.author.avatarUrl} size="small" />
                            <div className={styles.replyContent}>
                              <div className={styles.replyAuthor}><strong>{comment.author.name}</strong><span><FeedTimestamp value={comment.created_at} /></span></div>
                              <p>{comment.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {canParticipate && replyingTo === post.id && (
                      <form className={styles.replyForm} onSubmit={(event) => { event.preventDefault(); void submitReply(post.id); }}>
                        <textarea ref={replyFieldRef} className={`sabha-field ${styles.replyField}`} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`Reply to ${post.author.name}…`} maxLength={5000} aria-label="Reply" rows={2} />
                        {replyError && <p className={styles.error} role="alert">{replyError}</p>}
                        <div className={styles.replyActions}>
                          <button type="button" className={styles.cancelReply} onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</button>
                          <button type="submit" className="sabha-button sabha-button-primary" disabled={replyBusy || !replyText.trim()}>{replyBusy ? "Sending…" : "Reply"}</button>
                        </div>
                      </form>
                    )}
                    {canParticipate && commentingTo === post.id && (
                      <form className={styles.replyForm} onSubmit={(event) => { event.preventDefault(); void submitComment(post.id); }}>
                        <textarea ref={commentFieldRef} className={`sabha-field ${styles.replyField}`} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment…" maxLength={2000} aria-label="Comment" rows={1} />
                        {commentError && <p className={styles.error} role="alert">{commentError}</p>}
                        <div className={styles.replyActions}>
                          <button type="button" className={styles.cancelReply} onClick={() => { setCommentingTo(null); setCommentText(""); }}>Cancel</button>
                          <button type="submit" className="sabha-button sabha-button-primary" disabled={commentBusy || !commentText.trim()}>{commentBusy ? "Commenting…" : "Comment"}</button>
                        </div>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}><MessageCircle size={20} /></div>
                <h3>Nothing here yet.</h3>
                <p>Be the first to share something with the Sabha community.</p>
              </div>
            )}
            {(hasMore || loadingMore || loadMoreError) && (
              <div className={styles.pagination}>
                {loadMoreError && <p className={styles.paginationError} role="alert">{loadMoreError}</p>}
                <button type="button" className={styles.loadMore} onClick={() => void loadOlderPosts()} disabled={loadingMore}>
                  {loadingMore ? "Loading older posts…" : loadMoreError ? "Try again" : "Load older posts"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <aside className={styles.aside}>
        <section className={`${styles.asideCard} sabha-surface`}>
          <span className={styles.asideEyebrow}>YOUR COMMUNITY</span>
          <h2>Ideas grow when shared.</h2>
          <p>Use Feed for conversations and project updates. Link related Sabha blogs, projects, GitHub repositories, or README files.</p>
        </section>
      </aside>

      {sharingPost && (
        <ShareSheet
          open
          onClose={() => setSharingPostId(null)}
          shareData={{
            title: sharingPost.title?.trim() || `${sharingPost.author.name} on Sabha Feed`,
            text: sharingPost.body,
            url: `https://sabha.devvrats.in/feed/${sharingPost.id}`,
          }}
        />
      )}
    </div>
  );
}
