import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const fields = "id,title,excerpt,content,tags,category,created_at,profiles(name,username)";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const query = (url.searchParams.get("q") || "").slice(0, 1000);
  if (id && !/^[a-zA-Z0-9-]{1,80}$/.test(id)) return Response.json({ error: "Invalid article." }, { status: 400 });
  // Deliberately anonymous: RLS decides what a public visitor can read.
  // Never forward a visitor's cookies or use a service-role key here.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const recent = await db.from("posts").select(fields).order("created_at", { ascending: false }).limit(80);
  if (recent.error) return Response.json({ error: "Blogs are unavailable right now." }, { status: 503 });
  let rows = recent.data || [];
  if (id && !rows.some((row) => row.id === id)) {
    const selected = await db.from("posts").select(fields).eq("id", id).maybeSingle();
    if (selected.error) return Response.json({ error: "This blog is unavailable." }, { status: 503 });
    if (selected.data) rows = [selected.data, ...rows];
  }
  if (id && !rows.some((row) => row.id === id)) return Response.json({ error: "This blog is no longer publicly available." }, { status: 404 });
  const stopwords = new Set(["what", "with", "this", "that", "about", "blogs", "blog", "sabha", "please", "have", "from", "there", "does", "find", "some", "tell"]);
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].filter((word) => !stopwords.has(word)).slice(0, 20);
  const score = (row: typeof rows[number]) => {
    const title = `${row.title} ${(row.tags || []).join(" ")}`.toLowerCase();
    const body = `${row.excerpt} ${(row.content || []).join(" ")}`.toLowerCase();
    return words.reduce((sum, word) => sum + (title.includes(word) ? 3 : body.includes(word) ? 1 : 0), 0);
  };
  const latest = /what.?s new|what is new|latest|recent|happening/i.test(query);
  const ranked = latest ? rows : [...rows].sort((a, b) => score(b) - score(a));
  const selected = id ? rows.find((row) => row.id === id) : null;
  const chosen = [...(selected ? [selected] : []), ...ranked.filter((row) => row.id !== id)].slice(0, 5);
  const posts = chosen.map((row, index) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const full = (row.content || []).join("\n\n");
    const limit = index === 0 && selected ? 24_000 : 6000;
    return { id: row.id, title: row.title, excerpt: row.excerpt, content: full.slice(0, limit), truncated: full.length > limit,
      tags: row.tags || [], category: row.category, publishedAt: row.created_at,
      author: { name: profile?.name || "Unknown author", username: profile?.username || null },
      url: `https://sabha.devvrats.in/blogs/${row.id}` };
  });
  return Response.json({ posts, selectedId: id, fetchedAt: new Date().toISOString(), coverage: "Latest 80 public blogs plus the selected article; not an exhaustive archive search." }, { headers: { "Cache-Control": "no-store" } });
}
