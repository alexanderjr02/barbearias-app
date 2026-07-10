import { NextRequest } from "next/server";

// Best-effort client IP from standard proxy headers — this dev server has
// no reverse proxy in front of it locally, so this is often null outside of
// a real deployment, which is fine: new-IP detection simply no-ops then.
export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

// Whether this request actually arrived over HTTPS — used to decide the
// session cookies' `Secure` flag. Deliberately NOT based on
// NODE_ENV === "production": this app's docker-compose.yml serves plain
// HTTP with no reverse proxy/TLS by default (see README "Deploy em
// produção"), so a Secure cookie set purely from NODE_ENV gets silently
// dropped by the browser on any non-localhost, non-HTTPS origin (e.g.
// testing the web app from a phone via the machine's LAN IP) — the request
// still succeeds, but no session ever sticks, and every follow-up call
// looks unauthenticated. Checks x-forwarded-proto first (reverse proxy
// terminating TLS in front of the app), falling back to the request's own
// protocol (works for direct HTTPS deployments and for local plain HTTP).
export function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
  return request.nextUrl.protocol === "https:";
}
