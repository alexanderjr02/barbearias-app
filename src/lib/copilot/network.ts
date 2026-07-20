import { prisma } from "@/lib/db";
import { startOfUtcDay, addUtcDays, startOfUtcMonth } from "@/lib/dateRange";
import { revenueSummary, churnedClients, emptySlotsToday } from "./insights";
import { closeMonth } from "./analytics";

// Inteligência de REDE — o que nenhum concorrente entrega: o dono de várias
// unidades pergunta em linguagem natural e recebe a comparação entre elas.
// Hoje ele loga em 3 contas separadas e soma no Excel.
//
// Tudo aqui parte do ownerId (a rede é "as barbearias do mesmo dono") e
// reaproveita as funções por-unidade que já existem, agregando o resultado.

async function unitsOf(ownerId: string) {
  return prisma.barbershop.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, city: true },
  }) as Promise<{ id: string; name: string; city: string | null }[]>;
}

export interface UnitPerformance {
  name: string;
  city: string | null;
  monthRevenue: number;
  appointments: number;
  avgTicket: number;
  weekRevenue: number;
  weekDeltaPercent: number | null;
  staffCount: number;
  emptySlotsToday: number;
  churnedClients: number;
  revenuePerBarber: number;
}

/**
 * Panorama da rede: cada unidade lado a lado + os totais. É a resposta para
 * "como estão minhas lojas?" e a base de quase toda comparação.
 */
export async function networkOverview(ownerId: string) {
  const units = await unitsOf(ownerId);
  const rows: UnitPerformance[] = [];

  for (const u of units) {
    const [rev, staffCount, empty, churned] = await Promise.all([
      revenueSummary(u.id),
      prisma.staff.count({ where: { barbershopId: u.id, isActive: true } }),
      emptySlotsToday(u.id),
      churnedClients(u.id),
    ]);
    rows.push({
      name: u.name,
      city: u.city,
      monthRevenue: Math.round(rev.monthRevenue),
      appointments: rev.monthCount,
      avgTicket: Math.round(rev.avgTicket),
      weekRevenue: Math.round(rev.thisWeek),
      weekDeltaPercent: rev.weekDeltaPercent === null ? null : Math.round(rev.weekDeltaPercent),
      staffCount,
      emptySlotsToday: empty.totalFree,
      churnedClients: churned.length,
      // A métrica que revela a verdade: faturamento por barbeiro. Uma unidade
      // grande pode faturar mais e ainda assim ser a menos eficiente.
      revenuePerBarber: staffCount > 0 ? Math.round(rev.monthRevenue / staffCount) : 0,
    });
  }

  const totalRevenue = rows.reduce((s, r) => s + r.monthRevenue, 0);
  const totalAppointments = rows.reduce((s, r) => s + r.appointments, 0);
  const ranked = [...rows].sort((a, b) => b.monthRevenue - a.monthRevenue);
  const byEfficiency = [...rows].sort((a, b) => b.revenuePerBarber - a.revenuePerBarber);

  return {
    unitCount: rows.length,
    totalRevenue,
    totalAppointments,
    avgTicketNetwork: totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0,
    units: rows,
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    mostEfficient: byEfficiency[0] ?? null,
    leastEfficient: byEfficiency.length > 1 ? byEfficiency[byEfficiency.length - 1] : null,
  };
}

/** Fechamento consolidado: soma o mês de todas as unidades e mostra por loja. */
export async function networkMonthClose(ownerId: string, monthOffset = 0) {
  const units = await unitsOf(ownerId);
  const perUnit = [];
  for (const u of units) {
    const c = await closeMonth(u.id, monthOffset);
    perUnit.push({
      name: u.name,
      grossRevenue: c.grossRevenue,
      expenses: c.expenses,
      totalCommission: c.totalCommission,
      profit: c.profit,
      appointments: c.appointments,
    });
  }
  return {
    month: perUnit.length ? (await closeMonth(units[0].id, monthOffset)).month : null,
    unitCount: perUnit.length,
    totalGross: perUnit.reduce((s, u) => s + u.grossRevenue, 0),
    totalExpenses: perUnit.reduce((s, u) => s + u.expenses, 0),
    totalCommission: perUnit.reduce((s, u) => s + u.totalCommission, 0),
    totalProfit: perUnit.reduce((s, u) => s + u.profit, 0),
    perUnit,
  };
}

/**
 * Onde a REDE perde dinheiro, por unidade — para o dono saber em qual loja
 * agir primeiro em vez de tratar todas igual.
 */
export async function networkLeak(ownerId: string) {
  const units = await unitsOf(ownerId);
  const startMonth = startOfUtcMonth(new Date());
  const perUnit = [];

  for (const u of units) {
    const [rev, churned, empty, noShows] = await Promise.all([
      revenueSummary(u.id),
      churnedClients(u.id),
      emptySlotsToday(u.id),
      prisma.appointment.findMany({
        where: { barbershopId: u.id, status: "NO_SHOW", date: { gte: startMonth } },
        select: { totalPrice: true },
      }),
    ]);
    const avg = rev.avgTicket || 0;
    const noShowLost = (noShows as { totalPrice: number }[]).reduce((s, a) => s + a.totalPrice, 0);
    const leak = Math.round(churned.length * avg + noShowLost + empty.totalFree * avg);
    perUnit.push({
      name: u.name,
      leak,
      churned: churned.length,
      noShowLost: Math.round(noShowLost),
      emptySlotsToday: empty.totalFree,
    });
  }

  perUnit.sort((a, b) => b.leak - a.leak);
  return {
    totalLeak: perUnit.reduce((s, u) => s + u.leak, 0),
    worstUnit: perUnit[0] ?? null,
    perUnit,
  };
}

/**
 * Compara duas unidades de verdade (não só faturamento): eficiência por
 * barbeiro, ticket, ocupação e retenção — e diz em que cada uma ganha.
 */
export async function compareUnits(ownerId: string, nameA: string, nameB: string) {
  const units = await unitsOf(ownerId);
  const find = (n: string) => {
    const q = n.trim().toLowerCase();
    return units.find((u) => u.name.toLowerCase() === q) ?? units.find((u) => u.name.toLowerCase().includes(q) || q.includes(u.name.toLowerCase())) ?? null;
  };
  const a = find(nameA);
  const b = find(nameB);
  if (!a || !b) return { error: `Não achei ${!a ? nameA : nameB} na sua rede. Unidades: ${units.map((u) => u.name).join(", ")}.` };

  const overview = await networkOverview(ownerId);
  const ua = overview.units.find((u) => u.name === a.name);
  const ub = overview.units.find((u) => u.name === b.name);
  if (!ua || !ub) return { error: "Não consegui comparar agora." };

  const diff = (x: number, y: number) => (y === 0 ? null : Math.round(((x - y) / y) * 100));
  return {
    a: ua,
    b: ub,
    deltas: {
      revenuePercent: diff(ua.monthRevenue, ub.monthRevenue),
      avgTicketPercent: diff(ua.avgTicket, ub.avgTicket),
      revenuePerBarberPercent: diff(ua.revenuePerBarber, ub.revenuePerBarber),
      appointmentsPercent: diff(ua.appointments, ub.appointments),
    },
  };
}

/**
 * O melhor barbeiro de cada unidade e o ranking geral da rede — responde
 * "meu melhor barbeiro está na loja errada?".
 */
export async function networkStaffRanking(ownerId: string) {
  const units = await unitsOf(ownerId);
  const startMonth = startOfUtcMonth(new Date());
  const all: { name: string; unit: string; revenue: number; appointments: number }[] = [];

  for (const u of units) {
    const appts = await prisma.appointment.findMany({
      where: { barbershopId: u.id, status: "COMPLETED", date: { gte: startMonth } },
      select: { staffId: true, totalPrice: true, staff: { select: { name: true } } },
    });
    type A = { staffId: string; totalPrice: number; staff: { name: string } | null };
    const per = new Map<string, { name: string; revenue: number; count: number }>();
    for (const a of appts as A[]) {
      const cur = per.get(a.staffId) ?? { name: a.staff?.name ?? "barbeiro", revenue: 0, count: 0 };
      cur.revenue += a.totalPrice;
      cur.count += 1;
      per.set(a.staffId, cur);
    }
    for (const s of per.values()) {
      all.push({ name: s.name, unit: u.name, revenue: Math.round(s.revenue), appointments: s.count });
    }
  }

  all.sort((x, y) => y.revenue - x.revenue);
  return { ranking: all.slice(0, 15), top: all[0] ?? null };
}

/** Movimento por dia da semana em cada unidade — base para remanejar equipe. */
export async function networkBusyDays(ownerId: string) {
  const units = await unitsOf(ownerId);
  const since = addUtcDays(startOfUtcDay(new Date()), -90);
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const perUnit = [];

  for (const u of units) {
    const appts = await prisma.appointment.findMany({
      where: { barbershopId: u.id, status: { in: ["COMPLETED", "SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"] }, date: { gte: since } },
      select: { date: true },
    });
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const a of appts as { date: Date }[]) counts[a.date.getUTCDay()]++;
    const ranked = counts.map((c, i) => ({ day: names[i], count: c })).sort((x, y) => y.count - x.count);
    perUnit.push({ unit: u.name, busiest: ranked[0], quietest: ranked[ranked.length - 1] });
  }
  return { perUnit };
}
