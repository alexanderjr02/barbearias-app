import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { networkOverview } from "@/lib/copilot/network";
import { listUnits } from "@/lib/units";

// GET /api/units/overview — o painel da rede: KPIs consolidados + o
// desempenho de cada unidade lado a lado. Alimenta a tela "Unidades" no web e
// no app. Reaproveita exatamente o mesmo motor que o Copiloto usa, então o
// número da tela e o número que a IA fala nunca divergem.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const [overview, units] = await Promise.all([
    networkOverview(session.sub),
    listUnits(session.sub, session.barbershopId),
  ]);

  // Junta o desempenho (por nome) com id/slug/atual, que a UI precisa para
  // trocar de unidade.
  const byName = new Map(overview.units.map((u) => [u.name, u]));
  const merged = units.map((u) => {
    const perf = byName.get(u.name);
    return {
      id: u.id,
      name: u.name,
      city: u.city,
      slug: u.slug,
      isPrimary: u.isPrimary,
      isCurrent: u.isCurrent,
      monthRevenue: perf?.monthRevenue ?? 0,
      appointments: perf?.appointments ?? 0,
      avgTicket: perf?.avgTicket ?? 0,
      weekRevenue: perf?.weekRevenue ?? 0,
      weekDeltaPercent: perf?.weekDeltaPercent ?? null,
      staffCount: perf?.staffCount ?? 0,
      emptySlotsToday: perf?.emptySlotsToday ?? 0,
      churnedClients: perf?.churnedClients ?? 0,
      revenuePerBarber: perf?.revenuePerBarber ?? 0,
    };
  });

  return NextResponse.json({
    totals: {
      unitCount: overview.unitCount,
      totalRevenue: overview.totalRevenue,
      totalAppointments: overview.totalAppointments,
      avgTicket: overview.avgTicketNetwork,
    },
    best: overview.best?.name ?? null,
    worst: overview.worst?.name ?? null,
    mostEfficient: overview.mostEfficient?.name ?? null,
    leastEfficient: overview.leastEfficient?.name ?? null,
    units: merged,
  });
}
