import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// POST /api/notifications/read-all — mark every notification for this
// barbershop as read (e.g. when the gestor opens the bell dropdown).
export async function POST() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await prisma.notification.updateMany({ where: { barbershopId: session.barbershopId, clientId: null, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
