import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AnuSource = { id: string; kind: string; title: string; url: string; text: string; references?: Array<{title:string;url:string}> };
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Every query uses the request's session and RLS, never service credentials. */
export async function retrieveContext(db: Awaited<ReturnType<typeof createClient>>, userId: string, message: string, focus?: { kind: string; id: string }) {
  const sources: AnuSource[] = [];
  const unavailable: string[] = [];
  const words = [...new Set(message.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(0, 20);
  const groups = await Promise.all([
    db.from("projects").select("id,slug,name,tagline,description,technologies,stage,updated_at").order("updated_at", { ascending: false }).limit(40),
    db.from("posts").select("id,title,excerpt,content,created_at").order("created_at", { ascending: false }).limit(40),
    db.from("feed_posts").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(40),
    db.from("clans").select("id,slug,name,description,created_at").order("created_at", { ascending: false }).limit(40),
    // Recipient filtering is explicit as well as enforced by notifications RLS.
    db.from("notifications").select("id,title,message,created_at").eq("recipient_id", userId).order("created_at", { ascending: false }).limit(15),
  ]);
  const tables = ["projects", "posts", "feed_posts", "clans", "notifications"] as const;
  const kinds = ["project", "blog", "feed", "clan", "notification"];
  const fields = ["id,slug,name,tagline,description,technologies,stage,updated_at", "id,title,excerpt,content,created_at", "id,title,body,created_at", "id,slug,name,description,created_at", "id,title,message,created_at"];
  for (let index = 0; index < groups.length; index++) {
    const result = groups[index];
    if (result.error) { unavailable.push(kinds[index]); continue; }
    const rows = [...(result.data || [])] as unknown as Array<Record<string, unknown>>;
    if (focus?.kind === kinds[index] && !rows.some(row => row.id === focus.id)) {
      let selected = db.from(tables[index]).select(fields[index]).eq("id", focus.id);
      if (index === 4) selected = selected.eq("recipient_id", userId);
      const { data, error } = await selected.maybeSingle();
      if (error) unavailable.push(kinds[index]);
      else if (data) rows.unshift(data as unknown as Record<string, unknown>);
    }
    for (const row of rows) {
      const id = String(row.id);
      const kind = kinds[index];
      const path = index === 0 ? `/projects/${encodeURIComponent(String(row.slug))}` : index === 1 ? `/blogs/${id}` : index === 2 ? `/feed/${id}` : index === 3 ? `/feed/clans/${encodeURIComponent(String(row.slug))}` : "/notifications";
      sources.push({ id, kind, title: String(row.name || row.title || "Community update"), url: `https://sabha.devvrats.in${path}`, text: JSON.stringify(row).slice(0, 6000) });
    }
  }
  const score = (s: AnuSource) => words.reduce((total, word) => total + (s.title.toLowerCase().includes(word) ? 3 : s.text.toLowerCase().includes(word) ? 1 : 0), 0);
  const selected = sources.find(s => s.kind === focus?.kind && s.id === focus.id);
  const ranked = sources.filter(s => s !== selected).map((source, index) => ({ source, index, score: score(source) })).filter(s => s.score > 0).sort((a,b) => b.score-a.score || a.index-b.index);
  return { sources: [...(selected ? [selected] : []), ...ranked.map(s => s.source)].slice(0, 6), unavailable, focusUnavailable: !!focus && !selected, coverage: "Bounded search of up to 40 recently updated accessible records per area and 15 personal notifications, plus the selected record; not an exhaustive search.", fetchedAt: new Date().toISOString() };
}
