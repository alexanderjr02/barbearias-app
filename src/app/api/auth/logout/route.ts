import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { REFRESH_COOKIE, LEGACY_REFRESH_COOKIE, readCookieWithLegacy } from "@/lib/auth";
import { hashToken } from "@/lib/refreshToken";
import { clearSessionCookies } from "@/lib/sessionCookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const refreshToken = body?.refreshToken ?? readCookieWithLegacy(request.cookies, REFRESH_COOKIE, LEGACY_REFRESH_COOKIE);

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken
      .updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } })
      .catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
