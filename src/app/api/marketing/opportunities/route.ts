import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { emptySlotsThisWeek, churnedClients } from "@/lib/copilot/insights";
import { startOfUtcMonth } from "@/lib/dateRange";

// GET /api/marketing/opportunities — os números REAIS que alimentam os cards de
// oportunidade do Marketing (nada de dado inventado): horários vagos da semana,
// clientes sumidos, o nível do Autopilot, quanto o Copiloto já recuperou e o
// que ele fez. É a base do "o app acha a campanha, você só aprova".
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const bid = session.barbershopId;

  const shop = await prisma.barbershop.findUnique({
    where: { id: bid },
    select: { autopilotLevel: true, plan: true, autoConfirm: true, autoBirthday: true, autoWinbackDays: true },
  });

  const [week, churned, agg, feed] = await Promise.all([
    emptySlotsThisWeek(bid, 6),
    churnedClients(bid, shop?.autoWinbackDays ?? 45, 500),
    prisma.autopilotLog.aggregate({ where: { barbershopId: bid, createdAt: { gte: startOfUtcMonth(new Date()) } }, _sum: { recoveredValue: true }, _count: { _all: true } }),
    prisma.autopilotLog.findMany({ where: { barbershopId: bid }, orderBy: { createdAt: "desc" }, take: 8, select: { action: true, detail: true, createdAt: true } }),
  ]);

  return NextResponse.json({
    autopilotLevel: shop?.autopilotLevel ?? "suggest",
    plan: shop?.plan ?? "FREE",
    automations: { confirm: !!shop?.autoConfirm, birthday: !!shop?.autoBirthday, winbackDays: shop?.autoWinbackDays ?? null },
    freeSlotsWeek: week.totalFree,
    churnedCount: churned.filter((c) => c.clientId).length,
    recoveredThisMonth: agg._sum.recoveredValue ?? 0,
    actionsThisMonth: agg._count._all,
    feed,
  });
}
