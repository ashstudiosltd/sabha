import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AnuSource = { id: string; kind: string; title: string; url: string; text: string; references?: Array<{title:string;url:string}> };
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stop = new Set("the and for with from that this have what when where which who how can could please tell show about help me my our your their are was were is has does explain summarize summary search find latest recent new project projects blog blogs post posts feed clan clans sabha anu devvrats private public team members replies comments write publish draft create add building update edit".split(" "));
export function searchWords(message: string) { return [...new Set(message.toLowerCase().match(/[\p{L}\p{N}]{3,48}/gu) || [])].filter(word => !stop.has(word)).slice(0, 8); }
const areas = [
  { table: "projects", kind: "project", fields: "id,slug,name,tagline,description,technologies,stage,visibility,version,owner_id,publication_status,archived_at,updated_at", search: ["name", "tagline", "description"], date: "updated_at" },
  { table: "posts", kind: "blog", fields: "id,title,excerpt,content,created_at", search: ["title", "excerpt", "content"], date: "created_at" },
  { table: "feed_posts", kind: "feed", fields: "id,title,body,clan_id,author_id,created_at", search: ["title", "body"], date: "created_at" },
  { table: "clans", kind: "clan", fields: "id,slug,name,description,visibility,created_at", search: ["name", "description"], date: "created_at" },
  { table: "notifications", kind: "notification", fields: "id,title,message,created_at", search: ["title", "message"], date: "created_at" },
];
/** All reads use the member's Supabase session and existing RLS; no service-role client. */
export async function retrieveContext(db: Awaited<ReturnType<typeof createClient>>, userId: string | null, message: string, focus?: { kind: string; id: string }) {
  const words = searchWords(message);
  const unavailable: string[] = [];
  const sources: AnuSource[] = [];
  const records = new Map<AnuSource, Record<string, unknown>>();
  const groups = await Promise.all(areas.map(async area => {
    if (!userId && area.kind === "notification") return { data: [], error: null };
    if (!userId && area.kind === "feed") {
      return db.rpc("get_public_feed_for_anu", {
        p_search_terms: words,
        p_focus_id: focus?.kind === "feed" ? focus.id : null,
        p_limit: 6,
      });
    }
    let query = db.from(area.table).select(area.fields);
    if (userId && area.kind === "project" && /\b(my|our)\b.*\bprojects?\b|\bprojects?\b.*\bmine\b/i.test(message)) {
      const memberships=await db.from("project_members").select("project_id").eq("profile_id",userId).limit(200);
      if(memberships.error)unavailable.push("project:memberships");
      const ids=(memberships.data||[]).map(row=>row.project_id).filter((id:unknown)=>typeof id==="string"&&uuid.test(id));
      query=query.or(`owner_id.eq.${userId}${ids.length?`,id.in.(${ids.join(",")})`:""}`);
    }
    if (userId && area.kind === "clan" && /\b(my|our)\b.*\bclans?\b|\bclans?\b.*\bmine\b/i.test(message)) {
      const memberships=await db.from("clan_members").select("clan_id").eq("user_id",userId).limit(200);
      if(memberships.error)unavailable.push("clan:memberships");
      const ids=(memberships.data||[]).map(row=>row.clan_id).filter((id:unknown)=>typeof id==="string"&&uuid.test(id));
      if(!ids.length)return {data:[],error:null};
      query=query.in("id",ids);
    }
    if ((area.kind === "project" || area.kind === "clan") && /\bprivate\b/i.test(message)) query = query.eq("visibility", "private");
    if (area.kind === "notification" && userId) query = query.eq("recipient_id", userId);
    if (words.length) query = query.or(words.flatMap(word => area.search.map(field => `${field}.ilike.%${word}%`)).join(","));
    return query.order(area.date, { ascending: false }).limit(20);
  }));
  for (let index = 0; index < areas.length; index++) {
    const area = areas[index], result = groups[index];
    if (result.error) { unavailable.push(area.kind); continue; }
    const rows = [...(result.data || [])] as unknown as Array<Record<string, unknown>>;
    if (userId && focus?.kind === area.kind && !rows.some(row => row.id === focus.id)) {
      let query = db.from(area.table).select(area.fields).eq("id", focus.id);
      if (area.kind === "notification") query = query.eq("recipient_id", userId);
      const selected = await query.maybeSingle();
      if (selected.error) unavailable.push(area.kind);
      else if (selected.data) rows.unshift(selected.data as unknown as Record<string, unknown>);
    }
    for (const row of rows) {
      const id = String(row.id);
      const path = area.kind === "project" ? `/projects/${encodeURIComponent(String(row.slug))}` : area.kind === "blog" ? `/blogs/${id}` : area.kind === "feed" ? `/feed/${id}` : area.kind === "clan" ? `/feed/clans/${encodeURIComponent(String(row.slug))}` : "/notifications";
      const source = { id, kind: area.kind, title: String(row.name || row.title || "Community update"), url: `https://sabha.devvrats.in${path}`, text: JSON.stringify(row).slice(0, 4300) };
      sources.push(source); records.set(source, row);
    }
  }
  const score = (source: AnuSource) => words.reduce((total, word) => total + (source.title.toLowerCase().includes(word) ? 3 : source.text.toLowerCase().includes(word) ? 1 : 0), 0);
  const selected = sources.find(source => source.kind === focus?.kind && source.id === focus.id);
  const ranked = sources.filter(source => source !== selected).sort((a, b) => score(b) - score(a));
  const chosen = selected ? [selected] : [];
  // A broad question gets coverage across areas instead of only the first table.
  if (!words.length) for (const area of areas) { const source = ranked.find(item => item.kind === area.kind); if (source && !chosen.includes(source)) chosen.push(source); }
  for (const source of ranked) if (chosen.length < 6 && !chosen.includes(source)) chosen.push(source);
  await Promise.all(chosen.map(async source => {
    const requests: Array<{ name: string; query: PromiseLike<{ data: unknown; error: unknown }> }> = [];
    if (source.kind === "feed") {
      requests.push({ name: "replies", query: db.from("feed_replies").select("id,author_id,body,created_at").eq("post_id", source.id).order("created_at", { ascending: false }).limit(12) });
      requests.push({ name: "comments", query: db.from("feed_comments").select("id,author_id,body,created_at").eq("post_id", source.id).order("created_at", { ascending: false }).limit(12) });
    } else if (source.kind === "blog") {
      requests.push({ name: "comments", query: db.from("comments").select("id,user_id,content,created_at").eq("post_id", source.id).order("created_at", { ascending: false }).limit(12) });
    } else if (source.kind === "clan") {
      requests.push({ name: "members", query: db.from("clan_members").select("user_id,role").eq("clan_id", source.id).limit(20) });
      requests.push({ name: "recent_posts", query: db.from("feed_posts").select("id,title,body,author_id,created_at").eq("clan_id", source.id).order("created_at", { ascending: false }).limit(8) });
    } else if (source.kind === "project") {
      requests.push({ name: "team", query: db.rpc("get_project_team", { p_project_id: source.id }) });
      requests.push({ name: "contribution_guide", query: db.from("project_contribution_guides").select("overview,setup,first_steps,updated_at").eq("project_id", source.id).maybeSingle() });
    }
    const related: Record<string, unknown> = {};
    if (source.kind === "feed" && !userId) related.discussion = records.get(source)?.discussion;
    await Promise.all(requests.map(async ({ name, query }) => { const result = await query; if (result.error) unavailable.push(`${source.kind}:${name}`); else related[name] = result.data; }));
    const identities=new Set<string>();
    const collect=(value:unknown)=>{if(!value||typeof value!=="object")return;for(const key of ["author_id","user_id","owner_id"]){const id=(value as Record<string,unknown>)[key];if(typeof id==="string"&&uuid.test(id))identities.add(id);}};
    collect(records.get(source));
    for(const value of Object.values(related)){if(Array.isArray(value))value.forEach(collect);else collect(value);}
    if(identities.size){const {data,error}=await db.from("profiles").select("id,name,username").in("id",[...identities].slice(0,30));if(error)unavailable.push(`${source.kind}:profiles`);else related.profiles=data;}
    if (requests.length || identities.size) source.text = `${source.text}\nRELATED AUTHORIZED RECORDS (bounded excerpts):\n${JSON.stringify(related).slice(0, 1600)}`.slice(0, 6000);
  }));
  return { sources: chosen.slice(0, 6), unavailable, focusUnavailable: !!focus && !selected, coverage: `Keyword search across accessible records of all ages (up to 20 matches per area), or recent overview when no search terms remain; up to six records with bounded related discussions/teams. Not an exhaustive or semantic search. Unavailable areas: ${unavailable.join(", ") || "none"}.`, fetchedAt: new Date().toISOString() };
}
