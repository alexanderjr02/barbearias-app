import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { startOfUtcMonth } from "@/lib/dateRange";

// GET /api/barber/stats — the logged-in barber's own earnings snapshot
// for the current month, plus their all-time average rating.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "BARBER") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const staff = await prisma.staff.findUnique({ where: { userId: session.sub } });
  if (!staff) {
    return NextResponse.json({ error: "Nenhum perfil de barbeiro vinculado a este usuário" }, { status: 404 });
  }

  const startOfMonth = startOfUtcMonth(new Date());

  const [monthAppointments, ratingAgg] = await Promise.all([
    prisma.appointment.findMany({
      where: { staffId: staff.id, status: "COMPLETED", date: { gte: startOfMonth } },
      select: { totalPrice: true },
    }),
    prisma.review.aggregate({ where: { staffId: staff.id }, _avg: { rating: true }, _count: { rating: true } }),
  ]);

  const revenue = monthAppointments.reduce((acc, a) => acc + a.totalPrice, 0);
  const completedCount = monthAppointments.length;

  return NextResponse.json({
    monthRevenue: revenue,
    commissionRate: staff.commissionRate,
    commission: revenue * staff.commissionRate,
    completedCount,
    avgTicket: completedCount > 0 ? revenue / completedCount : 0,
    avgRating: ratingAgg._avg.rating,
    ratingCount: ratingAgg._count.rating,
  });
}
