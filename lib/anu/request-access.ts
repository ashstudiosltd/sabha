import "server-only";
import { timingSafeEqual } from "node:crypto";
/** A portal bridge also carries the member's normal Supabase session cookies. */
export function anuRequestAllowed(request: Request, userId: string) {
  const actor = request.headers.get("x-anu-member");
  if (actor) {
    const secret = process.env.ANU_INTEGRATION_SECRET;
    const supplied = Buffer.from(request.headers.get("x-anu-integration-key") || ""), expected = Buffer.from(secret || "");
    return !!secret && actor === userId && supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }
  return request.headers.get("origin") === new URL(request.url).origin;
}
