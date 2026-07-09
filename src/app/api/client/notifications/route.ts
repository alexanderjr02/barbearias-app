import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/client/notifications — the logged-in client's own notifications
// (their appointment was confirmed/cancelled/completed by the shop). Distinct
// from /api/notifications, which is the shop-wide feed gestor/staff see.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { clientId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { clientId: session.sub, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
