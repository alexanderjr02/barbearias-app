import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { Role } from "./roles";

export const ACCESS_COOKIE = "cortix_access";
export const REFRESH_COOKIE = "cortix_refresh";

export const ACCESS_TOKEN_TTL = 15 * 60; // seconds
export const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // seconds
export const TWO_FACTOR_PENDING_TTL = 2 * 60; // seconds — just long enough to type a 6-digit code

export interface SessionPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
  barbershopId: string | null;
  /**
   * Presente só quando esta sessão é uma impersonação: o id do admin que a
   * abriu. É o que sustenta as três coisas que impersonação segura exige —
   * a faixa de aviso na tela (ninguém age achando que é o dono), o caminho de
   * volta, e o rastro de quem entrou onde.
   */
  imp?: string;
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

// Short-lived token proving "password already verified for this user,
// waiting on their 2FA code" — deliberately carries only a userId and a
// `purpose` tag distinguishing it from a real session token, so it can
// never be mistaken for (or reused as) one even if leaked.
interface PendingTwoFactorPayload {
  sub: string;
  purpose: "2fa_pending";
}

export async function signPendingTwoFactorToken(userId: string) {
  return new SignJWT({ sub: userId, purpose: "2fa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TWO_FACTOR_PENDING_TTL}s`)
    .sign(getSecretKey());
}

export async function verifyPendingTwoFactorToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const p = payload as unknown as PendingTwoFactorPayload;
    return p.purpose === "2fa_pending" ? p.sub : null;
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
