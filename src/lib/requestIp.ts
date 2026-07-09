import { NextRequest } from "next/server";

// Best-effort client IP from standard proxy headers — this dev server has
// no reverse proxy in front of it locally, so this is often null outside of
// a real deployment, which is fine: new-IP detection simply no-ops then.
export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
