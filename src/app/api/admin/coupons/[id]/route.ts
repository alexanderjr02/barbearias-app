import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

// PATCH /api/admin/coupons/[id] — liga/desliga um cupom.
//
// Revogar em vez de apagar: quem já resgatou continua com o acesso, e o
// histórico de a quem se deu cortesia sobrevive. Cupom apagado leva junto a
// resposta de "de onde veio essa conta de graça?".
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { isActive?: boolean } | null;
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "Informe isActive" }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({ where: { id }, select: { code: true } });
  if (!existing) return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });

  const coupon = await prisma.coupon.update({ where: { id }, data: { isActive: body.isActive } });

  await logAdminAction({
    actorId: session.sub,
    action: body.isActive ? "coupon.reactivated" : "coupon.revoked",
    targetType: "Coupon",
    targetId: id,
    metadata: { code: existing.code },
  });

  return NextResponse.json({ ok: true, coupon });
}
