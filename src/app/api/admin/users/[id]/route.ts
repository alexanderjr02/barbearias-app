import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Informe isActive" }, { status: 400 });
  }

  if (id === session.sub && body.isActive === false) {
    return NextResponse.json({ error: "Você não pode desativar sua própria conta" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id }, data: { isActive: body.isActive } });

  if (!body.isActive) {
    // Revoke outstanding refresh tokens so an already-active session can't
    // keep renewing past the short-lived access token.
    await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  await logAdminAction({
    actorId: session.sub,
    action: body.isActive ? "user.activated" : "user.deactivated",
    targetType: "User",
    targetId: id,
  });

  return NextResponse.json({ id: user.id, isActive: user.isActive });
}
