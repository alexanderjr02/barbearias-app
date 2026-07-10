import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signAccessToken, REFRESH_COOKIE } from "@/lib/auth";
import { generateRefreshToken, hashToken } from "@/lib/refreshToken";
import { isRole } from "@/lib/roles";
import { setSessionCookies, clearSessionCookies } from "@/lib/sessionCookies";
import { isSecureRequest } from "@/lib/requestIp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const incomingToken: string | undefined = body?.refreshToken ?? request.cookies.get(REFRESH_COOKIE)?.value;

    if (!incomingToken) {
      return NextResponse.json({ error: "Refresh token ausente" }, { status: 401 });
    }

    const tokenHash = hashToken(incomingToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { barbershop: true, staffProfile: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      const response = NextResponse.json({ error: "Refresh token inválido" }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const { user } = stored;
    const role = isRole(user.role) ? user.role : "CLIENT";
    const barbershopId = user.barbershop?.id ?? user.staffProfile?.barbershopId ?? null;
    const session = { sub: user.id, role, name: user.name, email: user.email, barbershopId };

    const accessToken = await signAccessToken(session);
    const { token: newRefreshToken, tokenHash: newHash, expiresAt } = generateRefreshToken();
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: newHash, expiresAt } });

    const response = NextResponse.json({ accessToken, refreshToken: newRefreshToken });
    setSessionCookies(response, accessToken, newRefreshToken, isSecureRequest(request));
    return response;
  } catch {
    return NextResponse.json({ error: "Erro ao renovar sessão" }, { status: 500 });
  }
}
