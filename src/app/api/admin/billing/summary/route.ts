import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import {
  getPlanPricing, ensureMonthlyRenewals, PLANS,
  getCurrentMrr, getMrrMovement, getChurnMetrics, getRevenueAtRisk, getMrrForecast,
} from "@/lib/billing";

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  await ensureMonthlyRenewals();

  const [barbershops, pricing, revenueByMonthRaw, failedInvoices, mrr, mrrMovement, churn, revenueAtRisk, forecast] = await Promise.all([
    prisma.barbershop.findMany({ select: { plan: true, isActive: true } }),
    getPlanPricing(),
    prisma.platformInvoice.findMany({
      where: { status: "PAID", paidAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
      select: { amount: true, paidAt: true },
    }),
    prisma.platformInvoice.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { barbershop: { select: { name: true } } },
    }),
    getCurrentMrr(),
    getMrrMovement(6),
    getChurnMetrics(),
    getRevenueAtRisk(),
    getMrrForecast(3),
  ]);

  type Shop = { plan: string; isActive: boolean };
  const shops: Shop[] = barbershops;

  const arr = mrr * 12;
  const activeCount = shops.filter((b) => b.isActive).length;
  const arpu = activeCount > 0 ? mrr / activeCount : 0;

  const revenueByPlan = Object.fromEntries(
    PLANS.map((p) => [p, shops.filter((b) => b.isActive && b.plan === p).length * pricing[p].price])
  );

  const now = new Date();
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("pt-BR", { month: "short" }), total: 0 });
  }
  type PaidInvoice = { amount: number; paidAt: Date | null };
  const revenueByMonth: PaidInvoice[] = revenueByMonthRaw;
  for (const inv of revenueByMonth) {
    if (!inv.paidAt) continue;
    const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.total += inv.amount;
  }

  return NextResponse.json({
    mrr,
    arr,
    arpu,
    revenueByPlan,
    revenueByMonth: months.map((m) => ({ label: m.label, total: m.total })),
    mrrMovement,
    churn,
    revenueAtRisk,
    forecast,
    failedInvoices: failedInvoices.map((inv: { id: string; barbershop: { name: string }; amount: number; plan: string; createdAt: Date }) => ({
      id: inv.id,
      barbershopName: inv.barbershop.name,
      amount: inv.amount,
      plan: inv.plan,
      createdAt: inv.createdAt,
    })),
  });
}
