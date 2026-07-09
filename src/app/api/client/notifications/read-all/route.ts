import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/client/notifications/read-all — mark every notification the
// client has as read (e.g. when they open the bell).
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await prisma.notification.updateMany({ where: { clientId: session.sub, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
