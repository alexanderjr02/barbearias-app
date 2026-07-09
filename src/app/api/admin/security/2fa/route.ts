import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { generateSecret, buildOtpAuthUri, verifyCode } from "@/lib/twoFactor";

// GET — current 2FA status for the logged-in admin.
export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { twoFactorEnabled: true } });
  return NextResponse.json({ enabled: user?.twoFactorEnabled ?? false });
}

// POST — starts enrollment: generates a secret and stores it (not yet
// active — twoFactorEnabled stays false until PATCH confirms a real code),
// so the admin can scan/enter it into an authenticator app before it's live.
export async function POST() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const secret = generateSecret();
  await prisma.user.update({ where: { id: session.sub }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });

  return NextResponse.json({ secret, otpauthUri: buildOtpAuthUri(session.email, secret) });
}

// PATCH — confirms enrollment with a real code from the authenticator app.
export async function PATCH(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.code) {
    return NextResponse.json({ error: "Informe o código" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { twoFactorSecret: true } });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "Nenhum cadastro de 2FA em andamento" }, { status: 400 });
  }
  if (!(await verifyCode(user.twoFactorSecret, String(body.code)))) {
    return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  }

  await prisma.user.update({ where: { id: session.sub }, data: { twoFactorEnabled: true } });
  await logAdminAction({ actorId: session.sub, action: "security.2fa_enabled", targetType: "User", targetId: session.sub });

  return NextResponse.json({ enabled: true });
}

// DELETE — disables 2FA for the logged-in admin.
export async function DELETE() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  await prisma.user.update({ where: { id: session.sub }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await logAdminAction({ actorId: session.sub, action: "security.2fa_disabled", targetType: "User", targetId: session.sub });

  return NextResponse.json({ enabled: false });
}
