import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, ACCESS_COOKIE } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/v1/:path*", "/uploads/:path*"],
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function proxy(request: NextRequest) {
  // /uploads/* are static files served from `public/`, but the Flutter app's
  // renderer fetches images via XHR (not a plain <img> tag) so the browser
  // enforces CORS on them just like an API call — needs the same open policy
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
  // client — CORS-enabled, and auth is enforced per-route (401 JSON), not
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

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const session = token ? await verifyAccessToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname.startsWith("/admin") && session.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
