import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, ACCESS_COOKIE, LEGACY_ACCESS_COOKIE, readCookieWithLegacy } from "@/lib/auth";

// Roda em tudo, menos os estáticos do Next e o favicon. Precisa ser amplo por
// causa do redirecionamento canônico abaixo: qualquer página em qualquer host
// tem de cair no domínio, não só /dashboard e /api.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// O sistema mora aqui. Tudo o mais é porta dos fundos.
const CANONICAL_HOST = "rukz.com.br";

// Hosts que PODEM servir sem redirecionar: o domínio oficial e o
// desenvolvimento local. Qualquer outro (www, *.vercel.app, os antigos
// cortix-*, a URL crua de um deploy) é mandado pro domínio.
function isAllowedHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  return h === CANONICAL_HOST || h === "localhost" || h === "127.0.0.1";
}

export async function proxy(request: NextRequest) {
  // 0) Domínio canônico. Antes de qualquer coisa: se não é o domínio oficial,
  //    manda pra lá com o MESMO caminho e query, 308 (preserva método e corpo).
  //    É o que faz o sistema "só funcionar no meu domínio" sem deixar link
  //    morto: os endereços velhos continuam levando o usuário ao lugar certo.
  const host = request.headers.get("host") ?? "";
  if (!isAllowedHost(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // /uploads/* are static files served from `public/`, but the Flutter app's
  // renderer fetches images via XHR (not a plain <img> tag) so the browser
  // enforces CORS on them just like an API call, needs the same open policy
  // as /api/v1 or every uploaded photo/logo/cover 404s from a LAN device.
  if (request.nextUrl.pathname.startsWith("/uploads")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // /api/v1/* is a token-based API for the web app and the future Flutter
  // client. CORS-enabled, and auth is enforced per-route (401 JSON), not
  // by redirecting to the login page like the dashboard/admin sections below.
  if (request.nextUrl.pathname.startsWith("/api/v1")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Área logada: só /dashboard e /admin exigem sessão. As demais páginas
  // (/login, landing, links de agendamento /[slug]) passam direto — por isso a
  // checagem é por caminho explícito, não um "else" que pegaria tudo agora que
  // o matcher é amplo.
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const token = readCookieWithLegacy(request.cookies, ACCESS_COOKIE, LEGACY_ACCESS_COOKIE);
    const session = token ? await verifyAccessToken(token) : null;

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/admin") && session.role !== "SUPER_ADMIN" && session.role !== "SUPPORT_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}
