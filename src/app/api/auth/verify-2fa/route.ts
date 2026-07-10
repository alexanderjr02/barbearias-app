import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPendingTwoFactorToken } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { completeLogin } from "@/lib/completeLogin";
import { verifyCode } from "@/lib/twoFactor";
import { getClientIp, isSecureRequest } from "@/lib/requestIp";

// POST /api/auth/verify-2fa — second step of login for a 2FA-enabled
// account. Body: { pendingToken, code }.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.pendingToken || !body?.code) {
    return NextResponse.json({ error: "Informe o código de verificação" }, { status: 400 });
  }

  const userId = await verifyPendingTwoFactorToken(body.pendingToken);
  if (!userId) {
    return NextResponse.json({ error: "Sessão de verificação expirada, faça login novamente" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { barbershop: true, staffProfile: { include: { barbershop: true } } },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: "2FA não está ativo para esta conta" }, { status: 400 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: "Esta conta foi desativada" }, { status: 403 });
  }

  if (!(await verifyCode(user.twoFactorSecret, String(body.code)))) {
    return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  }

  const resolvedBarbershop = user.barbershop ?? user.staffProfile?.barbershop ?? null;
  const role = isRole(user.role) ? user.role : "CLIENT";
  const barbershopId = resolvedBarbershop?.id ?? null;

  return await completeLogin({ sub: user.id, role, name: user.name, email: user.email, barbershopId }, getClientIp(request), isSecureRequest(request));
}
