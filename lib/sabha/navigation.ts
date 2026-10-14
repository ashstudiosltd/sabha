export interface BackDestination { href: string; label: string }

export function backDestination(pathname: string, search = ""): BackDestination {
  const query = new URLSearchParams(search);
  const clanSettings = pathname.match(/^\/feed\/clans\/([^/]+)\/settings$/);
  if (clanSettings) return { href: `/feed/clans/${clanSettings[1]}`, label: "Back to Clan" };
  if (pathname.startsWith("/feed/clans/") || pathname.startsWith("/feed/clan-invites/")) return { href: "/feed?view=clans", label: "Back to Clans" };
  if (pathname === "/feed/new") {
    const clan = query.get("clan");
    if (clan && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(clan)) return { href: `/feed/clans/${clan}`, label: "Back to Clan" };
    return { href: query.get("type") === "project" ? "/feed?view=project" : "/feed", label: "Back to Feed" };
  }
  if (pathname.startsWith("/feed/")) return { href: "/feed", label: "Back to Feed" };
  if (pathname.startsWith("/blogs/")) return { href: "/blogs", label: "Back to Blogs" };
  const connections = pathname.match(/^\/profile\/([^/]+)\/connections$/);
  if (connections) return { href: `/profile/${connections[1]}`, label: "Back to profile" };
  if (pathname.startsWith("/profile/") || pathname === "/settings/profile") return { href: "/feed", label: "Back to Feed" };
  if (pathname === "/auth") return { href: "/", label: "Back to Sabha" };
  if (pathname === "/") return { href: "/blogs", label: "Go to Blogs" };
  return { href: "/", label: "Back to Sabha" };
}

export const NAVIGATION_STORAGE_KEY = "sabha-navigation-v1";

export function resolveBackDestination(pathname: string, search: string, visited: string[], fallback?: BackDestination): BackDestination {
  const base = fallback ?? backDestination(pathname, search);
  const entries = visited.slice().reverse();
  for (const href of entries) {
    // Only app-relative paths are accepted, including when storage is edited.
    if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) continue;
    const url = new URL(href, "https://sabha.local");
    if (url.origin !== "https://sabha.local" || url.pathname === pathname || url.pathname.startsWith("/auth") || url.pathname.startsWith("/api/")) continue;
    if ((pathname.startsWith("/profile/") && !pathname.endsWith("/connections")) || pathname === "/auth" || pathname === "/notifications") {
      if (url.pathname === "/blogs" || url.pathname === "/feed" || /^\/feed\/clans\/[^/]+$/.test(url.pathname)) {
        return { href, label: url.pathname === "/blogs" ? "Back to Blogs" : url.pathname === "/feed" ? "Back to Feed" : "Back to Clan" };
      }
    }
    // Keep the parent page's search, tab and sort state when returning to it.
    const parent = new URL(base.href, "https://sabha.local");
    if (url.pathname !== parent.pathname) continue;
    if (parent.searchParams.has("view") && url.searchParams.get("view") !== parent.searchParams.get("view")) continue;
    return { href, label: base.label };
  }
  return base;
}
