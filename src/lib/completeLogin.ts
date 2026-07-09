import { NextResponse } from "next/server";
import { prisma } from "./db";
import { signAccessToken, type SessionPayload } from "./auth";
import { generateRefreshToken } from "./refreshToken";
import { setSessionCookies } from "./sessionCookies";
import { notify } from "./notifications";

// Shared by the normal single-step login (/api/auth/login) and the second
// step of 2FA (/api/auth/verify-2fa) — issuing a session is identical either
// way, only how we got there differs.
export async function completeLogin(session: SessionPayload, ipAddress?: string | null) {
  const accessToken = await signAccessToken(session);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({ data: { userId: session.sub, tokenHash, expiresAt } });
  await prisma.user.update({ where: { id: session.sub }, data: { lastLoginAt: new Date() } });

  // A login from an IP never seen before for this user — only meaningful
  // when we actually have an IP (local/dev requests often don't carry one).
  let isNewIp = false;
  if (ipAddress) {
    const priorFromThisIp = await prisma.loginEvent.findFirst({ where: { userId: session.sub, ipAddress } });
    isNewIp = !priorFromThisIp;
  }
  await prisma.loginEvent.create({ data: { userId: session.sub, ipAddress: ipAddress ?? null, isNewIp } });

  if (isNewIp) {
    await notify(
      "NEW_IP_LOGIN",
      `Novo IP de login: ${session.name}`,
      `${session.name} (${session.email}) fez login de um endereço IP nunca visto antes: ${ipAddress}.`,
      { userId: session.sub, ipAddress }
    );
  }

  const response = NextResponse.json({
    user: { id: session.sub, name: session.name, email: session.email, role: session.role, barbershopId: session.barbershopId },
    accessToken,
    refreshToken,
  });

  setSessionCookies(response, accessToken, refreshToken);
  return response;
}
