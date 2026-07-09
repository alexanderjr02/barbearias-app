import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// GET /api/notifications — last 30 personal events for this barbershop
// (new booking, cancellation, support reply), plus the unread count used to
// badge the bell alongside platform Avisos.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { barbershopId: session.barbershopId, clientId: null },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { barbershopId: session.barbershopId, clientId: null, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
