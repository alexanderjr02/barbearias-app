import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyAdminSession, denyAdmin } from "@/lib/apiAuth";
import { getPlanPricing, ensureMonthlyRenewals, PLANS } from "@/lib/billing";

export async function GET() {
  const session = await requireAnyAdminSession();
  if (!session) {
    return denyAdmin();
  }

  await ensureMonthlyRenewals();

  const [barbershops, pricing, usersByRole, recentBarbershops, recentInvoices, failedInvoices30d, suspendedBarbershops, pendingWhiteLabel, openTickets] = await Promise.all([
    prisma.barbershop.findMany({ select: { id: true, plan: true, isActive: true, createdAt: true } }),
    getPlanPricing(),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    prisma.barbershop.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, slug: true, plan: true, primaryColor: true, logo: true, createdAt: true, owner: { select: { name: true, email: true } } },
    }),
    prisma.platformInvoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { barbershop: { select: { name: true } } },
    }),
    prisma.platformInvoice.count({
      where: { status: "FAILED", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.barbershop.count({ where: { isActive: false } }),
    prisma.whiteLabelRequest.count({ where: { status: { not: "DELIVERED" } } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  type BarbershopRow = { id: string; plan: string; isActive: boolean; createdAt: Date };
  const shops: BarbershopRow[] = barbershops;

  const total = shops.length;
  const active = shops.filter((b) => b.isActive).length;
  const byPlan = Object.fromEntries(PLANS.map((p) => [p, shops.filter((b) => b.plan === p).length])) as Record<string, number>;

  const mrr = shops.filter((b) => b.isActive).reduce((sum: number, b) => {
    const plan = PLANS.includes(b.plan as (typeof PLANS)[number]) ? b.plan : "FREE";
    return sum + pricing[plan as (typeof PLANS)[number]].price;
  }, 0);
  const arr = mrr * 12;

  // Signups per month, last 6 months (including months with zero).
  const now = new Date();
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" });
    months.push({ key, label, count: 0 });
  }
  for (const b of shops) {
    const key = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.count += 1;
  }

  const roleCounts = Object.fromEntries(usersByRole.map((r: { role: string; _count: { role: number } }) => [r.role, r._count.role]));

  return NextResponse.json({
    total,
    active,
    inactive: total - active,
    byPlan,
    mrr,
    arr,
    signupsByMonth: months.map((m) => ({ label: m.label, count: m.count })),
    usersByRole: roleCounts,
    recentBarbershops,
    recentInvoices: recentInvoices.map((inv: { id: string; barbershop: { name: string }; plan: string; amount: number; status: string; reason: string; createdAt: Date }) => ({
      id: inv.id,
      barbershopName: inv.barbershop.name,
      plan: inv.plan,
      amount: inv.amount,
      status: inv.status,
      reason: inv.reason,
      createdAt: inv.createdAt,
    })),
    failedInvoices30d,
    alerts: {
      failedInvoices: failedInvoices30d,
      suspendedBarbershops,
      pendingWhiteLabel,
      openTickets,
    },
  });
}
