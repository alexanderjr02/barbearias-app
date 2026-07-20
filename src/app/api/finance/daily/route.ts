import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// Explicit row shapes — the libsql-adapter Prisma client is typed `any`, so we
// annotate query results ourselves to keep the reducers type-safe.
interface ApptRow { staffId: string | null; totalPrice: number; paymentMethod: string | null }
interface StaffRow { id: string; name: string; commissionRate: number; avatar: string | null }
interface TxnRow { type: string; amount: number; paymentMethod: string | null; category: string; description: string }
interface MonthApptRow { date: Date; totalPrice: number }

// Normalizes the many ways a payment method can be stored into a few clean,
// display-ready buckets for the daily cash close.
function methodLabel(raw: string | null): string {
  if (!raw) return "Não informado";
  const v = raw.toUpperCase();
  if (v.includes("PIX")) return "Pix";
  if (v.includes("DINH") || v.includes("CASH") || v.includes("ESPÉCIE") || v.includes("ESPECIE")) return "Dinheiro";
  if (v.includes("CRED")) return "Cartão de crédito";
  if (v.includes("DEB")) return "Cartão de débito";
  if (v.includes("CART") || v.includes("CARD")) return "Cartão";
  return raw;
}

// GET /api/finance/daily?date=YYYY-MM-DD (default today) — the "Caixa do Dia":
// everything a gestor needs to close the till: total, ticket médio, breakdown
// by payment method, per-barber production + commission owed, manual in/out,
// and how the day compares to the month's daily average.
export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const base = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }
  const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);

  const [completed, staff, txns, monthCompleted]: [ApptRow[], StaffRow[], TxnRow[], MonthApptRow[]] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId: session.barbershopId, status: "COMPLETED", date: { gte: dayStart, lt: dayEnd } },
      select: { staffId: true, totalPrice: true, paymentMethod: true },
    }),
    prisma.staff.findMany({
      where: { barbershopId: session.barbershopId },
      select: { id: true, name: true, commissionRate: true, avatar: true },
    }),
    prisma.financialTransaction.findMany({
      where: { barbershopId: session.barbershopId, date: { gte: dayStart, lt: dayEnd } },
      select: { type: true, amount: true, paymentMethod: true, category: true, description: true },
    }),
    prisma.appointment.findMany({
      where: { barbershopId: session.barbershopId, status: "COMPLETED", date: { gte: monthStart, lt: dayEnd } },
      select: { date: true, totalPrice: true },
    }),
  ]);

  const staffById = new Map<string, StaffRow>(staff.map((s) => [s.id, s]));

  const serviceRevenue = completed.reduce((s, a) => s + a.totalPrice, 0);
  const manualIncome = txns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const manualExpense = txns.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const totalRevenue = serviceRevenue + manualIncome;
  const net = totalRevenue - manualExpense;
  const appointmentCount = completed.length;
  const avgTicket = appointmentCount > 0 ? serviceRevenue / appointmentCount : 0;

  // By payment method (service revenue + manual income).
  const methodMap = new Map<string, number>();
  for (const a of completed) methodMap.set(methodLabel(a.paymentMethod), (methodMap.get(methodLabel(a.paymentMethod)) ?? 0) + a.totalPrice);
  for (const t of txns) if (t.type === "INCOME") methodMap.set(methodLabel(t.paymentMethod), (methodMap.get(methodLabel(t.paymentMethod)) ?? 0) + t.amount);
  const byMethod = Array.from(methodMap.entries())
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);

  // By barber: revenue, count and commission owed.
  const barberMap = new Map<string, { staffId: string; name: string; avatar: string | null; revenue: number; count: number; commission: number }>();
  for (const a of completed) {
    if (!a.staffId) continue;
    const st = staffById.get(a.staffId);
    const entry = barberMap.get(a.staffId) ?? {
      staffId: a.staffId,
      name: st?.name ?? "Barbeiro",
      avatar: st?.avatar ?? null,
      revenue: 0,
      count: 0,
      commission: 0,
    };
    entry.revenue += a.totalPrice;
    entry.count += 1;
    entry.commission += a.totalPrice * (st?.commissionRate ?? 0.4);
    barberMap.set(a.staffId, entry);
  }
  const byBarber = Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);
  const totalCommission = byBarber.reduce((s, b) => s + b.commission, 0);

  // Comparison vs the month's daily average (up to and including this day).
  const daysElapsed = new Set(monthCompleted.map((a) => a.date.toDateString())).size || 1;
  const monthRevenue = monthCompleted.reduce((s, a) => s + a.totalPrice, 0);
  const avgDailyRevenue = monthRevenue / daysElapsed;
  const vsAveragePct = avgDailyRevenue > 0 ? Math.round((serviceRevenue / avgDailyRevenue - 1) * 100) : 0;

  return NextResponse.json({
    date: dayStart.toISOString().slice(0, 10),
    totalRevenue,
    serviceRevenue,
    manualIncome,
    manualExpense,
    net,
    appointmentCount,
    avgTicket,
    totalCommission,
    byMethod,
    byBarber,
    avgDailyRevenue,
    vsAveragePct,
  });
}
