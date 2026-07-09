import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// GET /api/announcements/active — active announcements targeted at this
// gestor's plan tier, excluding ones they've already dismissed. Powers the
// bell icon in the gestor Topbar (previously purely decorative).
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const barbershop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  const plan = barbershop?.plan ?? "FREE";

  const announcements = await prisma.platformAnnouncement.findMany({
    where: {
      isActive: true,
      audience: { in: ["ALL", plan] },
      dismissals: { none: { userId: session.sub } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, body: true, createdAt: true },
  });

  return NextResponse.json(announcements);
}
