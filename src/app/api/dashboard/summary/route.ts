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

  const [todayAppointments, yesterdayAppointments, monthAppointments, activeClientAppointments] = await Promise.all([
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
    avgTicket,
    topBarbers: topBarbers.map((b) => ({ ...b, share: b.appointments / maxBarberAppointments })),
    recentAppointments,
  });
}
