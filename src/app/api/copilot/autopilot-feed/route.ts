import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { startOfUtcMonth } from "@/lib/dateRange";

// GET /api/copilot/autopilot-feed — the "o que o Copiloto fez por você" activity
// feed + the "receita recuperada" number (this month), the ROI proof.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const startMonth = startOfUtcMonth(new Date());
  const [logs, agg] = await Promise.all([
    prisma.autopilotLog.findMany({ where: { barbershopId: session.barbershopId }, orderBy: { createdAt: "desc" }, take: 25, select: { action: true, detail: true, recoveredValue: true, createdAt: true } }),
    prisma.autopilotLog.aggregate({ where: { barbershopId: session.barbershopId, createdAt: { gte: startMonth } }, _sum: { recoveredValue: true }, _count: { _all: true } }),
  ]);
  type Row = (typeof logs)[number];
  return NextResponse.json({
    recoveredTotal: agg._sum.recoveredValue ?? 0,
    actionsThisMonth: agg._count._all,
    feed: (logs as Row[]).map((l) => ({ action: l.action, detail: l.detail, recoveredValue: l.recoveredValue, createdAt: l.createdAt })),
  });
}
