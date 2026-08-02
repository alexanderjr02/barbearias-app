import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { startOfUtcDay, addUtcDays, startOfUtcMonth } from "@/lib/dateRange";

export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const barbershopId = session.barbershopId;
  const now = new Date();
  const startOfToday = startOfUtcDay(now);
  const endOfToday = addUtcDays(startOfToday, 1);
  const startOfYesterday = addUtcDays(startOfToday, -1);
  const startOfMonth = startOfUtcMonth(now);
  const activeClientsSince = addUtcDays(startOfToday, -90);
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const sameDayLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()));

  const [todayAppointments, yesterdayAppointments, monthAppointments, activeClientAppointments, lastMonthAppointments, shop, workingHours, activeStaff, products] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: startOfToday, lt: endOfToday } },
      include: { staff: true, service: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: startOfYesterday, lt: startOfToday }, status: "COMPLETED" },
      select: { totalPrice: true },
    }),
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: startOfMonth }, status: "COMPLETED" },
      include: { staff: true },
    }),
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: activeClientsSince }, status: { not: "CANCELLED" } },
      select: { clientId: true, clientPhone: true },
    }),
    // O MESMO intervalo do mês passado, até o mesmo dia — comparar mês fechado
    // com mês em curso diria "caiu 60%" todo dia 5.
    prisma.appointment.findMany({
      where: { barbershopId, date: { gte: startOfLastMonth, lt: sameDayLastMonth }, status: "COMPLETED" },
      select: { totalPrice: true },
    }),
    prisma.barbershop.findUnique({
      where: { id: barbershopId },
      select: { monthlyGoal: true },
    }),
    prisma.workingHour.findMany({ where: { barbershopId } }),
    prisma.staff.count({ where: { barbershopId, isActive: true } }),
    // Estoque no talo: o gestor só descobre quando acaba na mão do barbeiro.
    prisma.product.findMany({
      where: { barbershopId, isActive: true },
      select: { name: true, quantity: true, minQuantity: true },
    }),
  ]);

  type TodayAppointmentRow = (typeof todayAppointments)[number];
  type YesterdayAppointmentRow = (typeof yesterdayAppointments)[number];
  type MonthAppointmentRow = (typeof monthAppointments)[number];
  type ActiveClientAppointmentRow = (typeof activeClientAppointments)[number];

  const todayCompleted = todayAppointments.filter((a: TodayAppointmentRow) => a.status === "COMPLETED");
  const todayRevenue = todayCompleted.reduce((acc: number, a: TodayAppointmentRow) => acc + a.totalPrice, 0);
  const yesterdayRevenue = yesterdayAppointments.reduce((acc: number, a: YesterdayAppointmentRow) => acc + a.totalPrice, 0);
  const todayCount = todayAppointments.filter((a: TodayAppointmentRow) => a.status !== "CANCELLED").length;
  const unconfirmedToday = todayAppointments.filter((a: TodayAppointmentRow) => a.status === "SCHEDULED").length;

  const activeClients = new Set(activeClientAppointments.map((a: ActiveClientAppointmentRow) => a.clientId ?? a.clientPhone)).size;

  const monthRevenue = monthAppointments.reduce((acc: number, a: MonthAppointmentRow) => acc + a.totalPrice, 0);
  const avgTicket = monthAppointments.length > 0 ? monthRevenue / monthAppointments.length : 0;

  // ---- O que um gestor decide de manhã ----

  const minutos = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Quanto AINDA vai entrar hoje: marcado, não cancelado, ainda não concluído.
  const todayPending = todayAppointments.filter(
    (a: TodayAppointmentRow) => a.status !== "CANCELLED" && a.status !== "COMPLETED" && a.status !== "NO_SHOW",
  );
  const todayExpected = todayPending.reduce((acc: number, a: TodayAppointmentRow) => acc + a.totalPrice, 0);

  // Ocupação de HOJE: minutos vendidos sobre a capacidade da casa (horário de
  // funcionamento × barbeiros ativos). É a métrica que vira dinheiro perdido.
  const hojeHorario = workingHours.find((h: (typeof workingHours)[number]) => h.dayOfWeek === now.getUTCDay());
  const capacidadeHoje =
    hojeHorario && hojeHorario.isOpen && activeStaff > 0
      ? Math.max(0, minutos(hojeHorario.closeTime) - minutos(hojeHorario.openTime)) * activeStaff
      : 0;
  const minutosVendidosHoje = todayAppointments
    .filter((a: TodayAppointmentRow) => a.status !== "CANCELLED" && a.status !== "NO_SHOW")
    .reduce((acc: number, a: TodayAppointmentRow) => acc + Math.max(0, minutos(a.endTime) - minutos(a.startTime)), 0);
  // Dia fechado tem capacidade zero — sem isto a tela diria "agenda cheia"
  // num domingo em que ninguem trabalha.
  const closedToday = capacidadeHoje === 0;
  const todayOccupancy = capacidadeHoje > 0 ? Math.min(100, Math.round((minutosVendidosHoje / capacidadeHoje) * 100)) : 0;
  const freeMinutesToday = Math.max(0, capacidadeHoje - minutosVendidosHoje);

  // Meta e projeção: o ritmo de hoje mantido até o fim do mês.
  const monthlyGoal = shop?.monthlyGoal ?? null;
  const diaDoMes = now.getUTCDate();
  const diasNoMes = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const projection = diaDoMes > 0 ? (monthRevenue / diaDoMes) * diasNoMes : 0;

  const lastMonthRevenue = lastMonthAppointments.reduce(
    (acc: number, a: (typeof lastMonthAppointments)[number]) => acc + a.totalPrice,
    0,
  );

  const noShowsToday = todayAppointments.filter((a: TodayAppointmentRow) => a.status === "NO_SHOW").length;
  const lowStock = products
    .filter((p: (typeof products)[number]) => p.quantity <= p.minQuantity)
    .map((p: (typeof products)[number]) => ({ name: p.name, quantity: p.quantity }))
    .slice(0, 5);

  const barberTotals = new Map<string, { name: string; appointments: number; revenue: number }>();
  for (const apt of monthAppointments) {
    const existing = barberTotals.get(apt.staffId) ?? { name: apt.staff.name, appointments: 0, revenue: 0 };
    existing.appointments += 1;
    existing.revenue += apt.totalPrice;
    barberTotals.set(apt.staffId, existing);
  }
  const topBarbers = Array.from(barberTotals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxBarberAppointments = topBarbers[0]?.appointments || 1;

  const recentAppointments = todayAppointments.slice(0, 8).map((apt: TodayAppointmentRow) => ({
    id: apt.id,
    client: apt.clientName,
    service: apt.service.name,
    barber: apt.staff.name,
    time: apt.startTime,
    status: apt.status,
    value: apt.totalPrice,
  }));

  return NextResponse.json({
    todayRevenue,
    yesterdayRevenue,
    todayCount,
    unconfirmedToday,
    activeClients,
    monthRevenue,
    todayExpected,
    todayOccupancy,
    closedToday,
    freeMinutesToday,
    monthlyGoal,
    projection,
    lastMonthRevenue,
    noShowsToday,
    lowStock,
    avgTicket,
    topBarbers: topBarbers.map((b) => ({ ...b, share: b.appointments / maxBarberAppointments })),
    recentAppointments,
  });
}
