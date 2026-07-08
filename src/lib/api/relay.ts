import { NextRequest } from "next/server";
import { ok, fail } from "./response";

type Handler<Ctx> = (request: NextRequest, ctx: Ctx) => Promise<Response>;

// /api/v1/* routes reuse the exact same handlers the web app already calls
// (single source of truth for the business logic) and just re-wrap the
// response in the { data, error } envelope documented for API consumers.
export async function relay<Ctx = undefined>(handler: Handler<Ctx>, request: NextRequest, ctx?: Ctx) {
  const res = await handler(request, ctx as Ctx);
  const body = await res.json().catch(() => null);
  const wrapped = !res.ok ? fail(body?.error ?? "Erro na requisição", res.status) : ok(body, { status: res.status });

  // Forward headers set by the underlying handler (e.g. Set-Cookie on login/refresh/logout) —
  // reconstructing the response via ok()/fail() would otherwise silently drop them.
  for (const [key, value] of res.headers.entries()) {
    if (key.toLowerCase() === "content-type" || key.toLowerCase() === "content-length") continue;
    wrapped.headers.append(key, value);
  }

  return wrapped;
}
