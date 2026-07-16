import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// GET /api/finance/overview — current-month figures for the "Meta & Ponto de
// Equilíbrio" cockpit: per-day revenue (completed appointments + manual
// income), total month expenses (the break-even target) and the owner-set
// monthly goal. Projection and break-even day are derived on the client.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();

  const [shop, appointments, transactions] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { monthlyGoal: true } }),
    prisma.appointment.findMany({
      where: { barbershopId: session.barbershopId, status: "COMPLETED", date: { gte: monthStart, lt: nextMonth } },
      select: { date: true, totalPrice: true },
    }),
    prisma.financialTransaction.findMany({
      where: { barbershopId: session.barbershopId, date: { gte: monthStart, lt: nextMonth } },
      select: { date: true, amount: true, type: true },
    }),
  ]);

  type ApptRow = (typeof appointments)[number];
  type TxnRow = (typeof transactions)[number];

  const dailyRevenue = new Array<number>(daysInMonth).fill(0);
  for (const a of appointments as ApptRow[]) {
    dailyRevenue[a.date.getDate() - 1] += a.totalPrice;
  }
  for (const t of transactions as TxnRow[]) {
    if (t.type === "INCOME") dailyRevenue[t.date.getDate() - 1] += t.amount;
  }
  const monthExpenses = (transactions as TxnRow[])
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthRevenue = dailyRevenue.reduce((sum, v) => sum + v, 0);

  return NextResponse.json({
    goal: shop?.monthlyGoal ?? null,
    monthLabel: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    daysInMonth,
    dayOfMonth,
    monthExpenses,
    monthRevenue,
    dailyRevenue,
  });
}

// PATCH /api/finance/overview { goal: number | null } — set the monthly goal.
export async function PATCH(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Apenas o dono pode definir a meta" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const raw = body?.goal;
  const goal = raw === null || raw === undefined || raw === "" ? null : Number(raw);
  if (goal !== null && (!Number.isFinite(goal) || goal < 0)) {
    return NextResponse.json({ error: "Meta inválida" }, { status: 400 });
  }
  await prisma.barbershop.update({ where: { id: session.barbershopId }, data: { monthlyGoal: goal } });
  return NextResponse.json({ goal });
}
