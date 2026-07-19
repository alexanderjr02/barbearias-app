import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signPendingTwoFactorToken } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { completeLogin } from "@/lib/completeLogin";
import { getClientIp, isSecureRequest } from "@/lib/requestIp";

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
      // barbershops (plural) — um dono pode ter várias unidades; a atual é
      // resolvida abaixo por resolveActiveBarbershopId.
      include: { barbershops: { orderBy: { createdAt: "asc" } }, staffProfile: { include: { barbershop: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });
    }

    // Google-only account (see /api/auth/google) — never had a password to
    // check against, so bcrypt.compare(_, null) would throw either way.
    if (!user.password) {
      return NextResponse.json({ error: "Esta conta usa login com Google — use o botão \"Continuar com Google\"" }, { status: 401 });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Esta conta foi desativada" }, { status: 403 });
    }

    // Dono: entra na unidade que estava usando (ou na primária). Barbeiro:
    // sempre a barbearia do seu perfil de staff.
    type Shop = { id: string; isActive: boolean };
    const ownedShops = (user.barbershops ?? []) as Shop[];
    const activeOwned = ownedShops.find((s) => s.id === user.activeBarbershopId) ?? ownedShops[0] ?? null;
    const resolvedBarbershop = activeOwned ?? user.staffProfile?.barbershop ?? null;
    if (resolvedBarbershop && !resolvedBarbershop.isActive) {
      return NextResponse.json({ error: "Esta barbearia está suspensa" }, { status: 403 });
    }

    // Password is correct, but a 2FA-enabled account (opt-in, only relevant
    // for SUPER_ADMIN today) needs a second step before a real session is
    // issued — see /api/auth/verify-2fa.
    if (user.twoFactorEnabled) {
      const pendingToken = await signPendingTwoFactorToken(user.id);
      return NextResponse.json({ requiresTwoFactor: true, pendingToken });
    }

    const role = isRole(user.role) ? user.role : "CLIENT";
    const barbershopId = resolvedBarbershop?.id ?? null;

    return await completeLogin({ sub: user.id, role, name: user.name, email: user.email, barbershopId }, getClientIp(request), isSecureRequest(request));
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "Erro ao entrar" }, { status: 500 });
  }
}
