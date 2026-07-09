import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// PATCH /api/notifications/{id} — mark one notification as read.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.barbershopId !== session.barbershopId || notification.clientId) {
    return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
  }

  const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
  return NextResponse.json(updated);
}
