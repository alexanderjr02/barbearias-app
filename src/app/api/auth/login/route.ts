import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAccessToken } from "@/lib/auth";
import { generateRefreshToken } from "@/lib/refreshToken";
import { isRole } from "@/lib/roles";
import { setSessionCookies } from "@/lib/sessionCookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  try {
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Informe e-mail e senha" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { barbershop: true, staffProfile: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });
    }

    const role = isRole(user.role) ? user.role : "CLIENT";
    const barbershopId = user.barbershop?.id ?? user.staffProfile?.barbershopId ?? null;

    const session = { sub: user.id, role, name: user.name, email: user.email, barbershopId };
    const accessToken = await signAccessToken(session);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role, barbershopId },
      accessToken,
      refreshToken,
    });

    setSessionCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "Erro ao entrar" }, { status: 500 });
  }
}
