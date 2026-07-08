import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { Role } from "./roles";

export const ACCESS_COOKIE = "cortix_access";
export const REFRESH_COOKIE = "cortix_refresh";

export const ACCESS_TOKEN_TTL = 15 * 60; // seconds
export const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // seconds

export interface SessionPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
  barbershopId: string | null;
}

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(getSecretKey());
}

// jose uses WebCrypto, so this is safe to call from Edge Middleware.
export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Only for use in Server Components / Route Handlers, never in Middleware
// (next/headers' cookies()/headers() are not available in that scope there).
// Accepts either the httpOnly web cookie or an `Authorization: Bearer <token>`
// header (used by the Flutter app, which has no cookie jar of its own).
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const cookieToken = store.get(ACCESS_COOKIE)?.value;
  if (cookieToken) return verifyAccessToken(cookieToken);

  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) return null;

  return verifyAccessToken(bearerToken);
}
