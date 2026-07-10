import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { startOfUtcDay, addUtcDays, startOfUtcMonth, addUtcMonths } from "@/lib/dateRange";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const SERVICE_COLORS = ["#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#6B7280"];

function dayKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}
function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const range = request.nextUrl.searchParams.get("range") === "week" ? "week" : "month";
  const barbershopId = session.barbershopId;
  const now = new Date();

  const bucketCount = range === "week" ? 7 : 6;
  const rangeStart = range === "week" ? addUtcDays(startOfUtcDay(now), -6) : addUtcMonths(startOfUtcMonth(now), -5);

  const [allAppointments, rangeTransactions] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId, status: { not: "CANCELLED" } },
      include: { staff: true, service: true },
      orderBy: { date: "asc" },
    }),
    prisma.financialTransaction.findMany({
      where: { barbershopId, date: { gte: rangeStart } },
    }),
  ]);

  // First-ever visit per client (across all history) to classify new vs returning within the window.
  const firstVisitKey = new Map<string, string>();
  for (const apt of allAppointments) {
    const key = apt.clientId ?? apt.clientPhone;
    if (!firstVisitKey.has(key)) {
      firstVisitKey.set(key, apt.id);
    }
  }

  type AppointmentRow = (typeof allAppointments)[number];
  const inRange = allAppointments.filter((a: AppointmentRow) => a.date >= rangeStart);

  const buckets = new Map<
    string,
    { label: string; receita: number; despesas: number; agendamentos: number; novos: number; retornantes: number }
  >();
  for (let i = 0; i < bucketCount; i++) {
    if (range === "week") {
      const d = addUtcDays(rangeStart, i);
      buckets.set(dayKey(d), { label: WEEKDAY_LABELS[d.getUTCDay()], receita: 0, despesas: 0, agendamentos: 0, novos: 0, retornantes: 0 });
    } else {
      const d = addUtcMonths(rangeStart, i);
      buckets.set(monthKey(d), { label: MONTH_LABELS[d.getUTCMonth()], receita: 0, despesas: 0, agendamentos: 0, novos: 0, retornantes: 0 });
    }
  }

  for (const apt of inRange) {
    const key = range === "week" ? dayKey(apt.date) : monthKey(apt.date);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.agendamentos += 1;
    if (apt.status === "COMPLETED") {
      bucket.receita += apt.totalPrice;
      const clientKey = apt.clientId ?? apt.clientPhone;
      if (firstVisitKey.get(clientKey) === apt.id) bucket.novos += 1;
      else bucket.retornantes += 1;
    }
  }
  for (const t of rangeTransactions) {
    if (t.type !== "EXPENSE") continue;
    const key = range === "week" ? dayKey(t.date) : monthKey(t.date);
    const bucket = buckets.get(key);
    if (bucket) bucket.despesas += t.amount;
  }

  const series = Array.from(buckets.values());
  const totalRevenue = series.reduce((a, b) => a + b.receita, 0);
  const totalExpenses = series.reduce((a, b) => a + b.despesas, 0);
  const totalAppointments = series.reduce((a, b) => a + b.agendamentos, 0);
  const completedInRange = inRange.filter((a: AppointmentRow) => a.status === "COMPLETED");

  const serviceTotals = new Map<string, { name: string; count: number }>();
  for (const apt of completedInRange) {
    const existing = serviceTotals.get(apt.serviceId) ?? { name: apt.service.name, count: 0 };
    existing.count += 1;
    serviceTotals.set(apt.serviceId, existing);
  }
  const servicesDistribution = Array.from(serviceTotals.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((s, i) => ({
      name: s.name,
      count: s.count,
      value: completedInRange.length > 0 ? Math.round((s.count / completedInRange.length) * 100) : 0,
      color: SERVICE_COLORS[i % SERVICE_COLORS.length],
    }));

  const staffTotals = new Map<string, { name: string; commissionRate: number; appointments: number; revenue: number }>();
  for (const apt of completedInRange) {
    const existing =
      staffTotals.get(apt.staffId) ?? { name: apt.staff.name, commissionRate: apt.staff.commissionRate, appointments: 0, revenue: 0 };
    existing.appointments += 1;
    existing.revenue += apt.totalPrice;
    staffTotals.set(apt.staffId, existing);
  }
  const staffPerformance = Array.from(staffTotals.values()).sort((a, b) => b.revenue - a.revenue);
  const topRevenue = staffPerformance[0]?.revenue || 1;

  return NextResponse.json({
    series,
    kpis: {
      totalRevenue,
      totalExpenses,
      totalAppointments,
      profit: totalRevenue - totalExpenses,
      avgTicket: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
    },
    servicesDistribution,
    staffPerformance: staffPerformance.map((s) => ({
      name: s.name,
      appointments: s.appointments,
      revenue: s.revenue,
      commission: s.revenue * s.commissionRate,
      pct: Math.round((s.revenue / topRevenue) * 100),
    })),
    retention: series.map((b) => ({ name: b.label, novos: b.novos, retornantes: b.retornantes })),
  });
}
