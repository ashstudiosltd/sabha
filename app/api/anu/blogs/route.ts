export const runtime = "nodejs";
export const maxDuration = 60;
const visits = new Map<string, { count: number; reset: number }>();
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const base = process.env.ANU_API_URL || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:5173" : "");
  if (!base) return json({ error: "Anu is not connected yet." }, 503);
  const now = Date.now();
  for (const [key, value] of visits) if (value.reset <= now) visits.delete(key);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const visit = visits.get(ip) || { count: 0, reset: now + 600_000 };
  if (visit.count >= 30 || (!visits.has(ip) && visits.size >= 10_000)) return json({ error: "Anu is busy. Please try again in a few minutes." }, 429);
  visit.count++; visits.set(ip, visit);
  try {
    if (Number(request.headers.get("content-length") || 0) > 40_000) return json({ error: "Please shorten your conversation." }, 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 40_000) return json({ error: "Please shorten your conversation." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Please enter a message." }, 400); }
    if (!body || typeof body.message !== "string" || !body.message.trim() || body.message.length > 2000 || !Array.isArray(body.history) || body.history.length > 20 || body.history.some((item: { role?: unknown; text?: unknown } | null) => !item || !["user", "assistant"].includes(String(item.role)) || typeof item.text !== "string" || item.text.length > 4000)) return json({ error: "Please send a shorter message or start a fresh conversation." }, 400);
    if (body.articleId != null && (typeof body.articleId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(body.articleId))) return json({ error: "Invalid article." }, 400);
    const upstream = await fetch(new URL("/api/integrations/blogs/chat", base), {
      method: "POST", headers: { "Content-Type": "application/json", ...(process.env.ANU_INTEGRATION_SECRET ? { "x-anu-integration-key": process.env.ANU_INTEGRATION_SECRET } : {}) }, cache: "no-store",
      body: JSON.stringify({ message: body.message, history: body.history, articleId: body.articleId || null, intent: body.intent === "summary" ? "summary" : "chat" }), signal: AbortSignal.timeout(55_000),
    });
    const data = await upstream.json();
    if (!upstream.ok) return json({ error: data.error || "Anu couldn't reply. Please try again." }, upstream.status);
    if (typeof data.reply !== "string") return json({ error: "Anu couldn't reply. Please try again." }, 502);
    return json({ reply: data.reply, summaryTitle: typeof data.summaryTitle === "string" ? data.summaryTitle : undefined, sources: Array.isArray(data.sources) ? data.sources : [] });
  } catch { return json({ error: "Anu couldn't connect just now. Please try again." }, 502); }
}
