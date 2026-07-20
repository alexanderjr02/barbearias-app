import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { startOfUtcMonth } from "@/lib/dateRange";

// GET /api/barber/tips — the logged-in barber's digital tips (gorjetas) for
// the current month, shown in the Ganhos screen.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "BARBER") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const staff = await prisma.staff.findUnique({ where: { userId: session.sub } });
  if (!staff) return NextResponse.json({ error: "Nenhum perfil de barbeiro vinculado" }, { status: 404 });

  const startOfMonth = startOfUtcMonth(new Date());
  const tips = await prisma.tip.findMany({
    where: { staffId: staff.id, createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: "desc" },
    include: { appointment: { select: { clientName: true } } },
  });
  type Row = (typeof tips)[number];
  const total = tips.reduce((acc: number, t: Row) => acc + t.amount, 0);
  return NextResponse.json({
    total,
    count: tips.length,
    tips: tips.map((t: Row) => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      clientName: t.appointment.clientName,
      createdAt: t.createdAt,
    })),
  });
}
