import { createClient } from "@/lib/supabase/server";
import { retrieveContext, uuid } from "@/lib/anu/context";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
const visits = new Map<string, { count: number; reset: number }>();
export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Open Anu from Sabha to continue." }, 403);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return json({ error: "Sign in to use your personal Anu." }, 401);
  const now = Date.now();
  for (const [id, visit] of visits) if (visit.reset <= now) visits.delete(id);
  const visit = visits.get(user.id) || { count: 0, reset: now + 600_000 };
  if (visit.count >= 20 || (!visits.has(user.id) && visits.size >= 10_000)) return json({ error: "Please give Anu a moment before trying again." }, 429);
  visit.count++; visits.set(user.id, visit);
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 40_000) return json({ error: "Please shorten your conversation." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Please enter a message." }, 400); }
    if (!body || typeof body.message !== "string" || !body.message.trim() || body.message.length > 2000) return json({ error: "Please enter a shorter message." }, 400);
    // Browser history is ignored; only server history supported by fresh context may be replayed.
    if (body.turnId != null && !uuid.test(body.turnId)) return json({ error: "Invalid conversation turn." }, 400);
    if (body.scope != null && (typeof body.scope !== "string" || !/^[a-z0-9:-]{1,120}$/i.test(body.scope))) return json({ error: "Invalid conversation." }, 400);
    if (body.focus && (!uuid.test(body.focus.id || "") || !["project", "blog", "feed", "clan", "notification"].includes(body.focus.kind))) return json({ error: "This reference is invalid." }, 400);
    const context = await retrieveContext(db, user.id, body.message, body.focus);
    const history: Array<{role: "user" | "assistant"; text: string}> = [];
    if (body.scope) {
      const { data: turns } = await db.from("anu_conversation_turns").select("question,answer,context_sources").eq("user_id", user.id).eq("scope", body.scope).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(4);
      const fresh = new Set(context.sources.map(source => `${source.kind}:${source.id}`));
      let size = 0;
      for (const turn of (turns || []).reverse()) {
        if (!Array.isArray(turn.context_sources) || !turn.context_sources.every((source: {kind:string;id:string}) => source && fresh.has(`${source.kind}:${source.id}`))) continue;
        if (typeof turn.question !== "string" || typeof turn.answer !== "string" || turn.question.length > 2000 || turn.answer.length > 4000) continue;
        if (size + turn.question.length + turn.answer.length > 12_000) continue;
        history.push({role:"user",text:turn.question},{role:"assistant",text:turn.answer});
        size += turn.question.length + turn.answer.length;
      }
    }
    const { data: profile } = await db.from("profiles").select("name,username").eq("id", user.id).maybeSingle();
    const production = process.env.NODE_ENV === "production";
    const base = new URL(process.env.ANU_API_URL?.trim() || (production ? "https://anu.devvrats.in" : "http://127.0.0.1:5173"));
    const local = !production && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if (base.username || base.password || base.search || base.hash || base.pathname !== "/" || (base.protocol !== "https:" && !(local && base.protocol === "http:"))) return json({ error: "Anu is temporarily unavailable." }, 503);
    const secret = process.env.ANU_INTEGRATION_SECRET;
    if (!secret) return json({ error: "Anu’s personal connection is being configured." }, 503);
    const response = await fetch(new URL("/api/integrations/sabha/chat", base), { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "x-anu-integration-key": secret }, body: JSON.stringify({ message: body.message.trim(), memberName: profile?.name || profile?.username || null, context, history }), signal: AbortSignal.timeout(55_000) });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.reply !== "string") return json({ error: "Anu couldn’t reply just now. Please try again." }, response.status === 429 ? 429 : 503);
    const allowed = new Map(context.sources.map(source => [`${source.kind}:${source.id}`, source]));
    const ids: unknown[] = Array.isArray(result.referenceIds) ? result.referenceIds : [];
    const sources = [...new Set(ids.filter((id): id is string => typeof id === "string"))].flatMap(id => { const s = allowed.get(id); return s ? [{ id: s.id, kind: s.kind, title: s.title, url: s.url }] : []; });
    let historySaved = false;
    if (body.turnId && body.scope) {
      const { error } = await db.from("anu_conversation_turns").insert({ id: body.turnId, user_id: user.id, scope: body.scope, question: body.message.trim(), answer: result.reply, sources, context_sources: context.sources.map(({ id, kind }) => ({ id, kind })) });
      historySaved = !error;
    }
    return json({ reply: result.reply, sources, historySaved, focusUnavailable: context.focusUnavailable });
  } catch { return json({ error: "Anu couldn’t connect just now. Please try again." }, 503); }
}
