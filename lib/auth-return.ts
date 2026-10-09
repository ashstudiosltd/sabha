// Sabha keeps its current identity project until the account migration is complete.
// Its existing login always returns to a safe page within Sabha.
export function sabhaAuthReturn(value: string | null, origin: string) {
  try {
    const target = new URL(value || "/", origin);
    if (target.origin !== origin || target.username || target.password || target.pathname === "/auth" || target.pathname.startsWith("/auth/")) return new URL("/", origin).href;
    return target.href;
  } catch { return new URL("/", origin).href; }
}
