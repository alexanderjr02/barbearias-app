import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { ensureMonthlyRenewals } from "@/lib/billing";
import { buildInvoiceWhere } from "./filters";

// GET /api/admin/billing/invoices?status=&plan=&search=&from=&to=&page=&pageSize=
export async function GET(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  await ensureMonthlyRenewals();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
  const where = buildInvoiceWhere(searchParams);

  const [total, invoices] = await Promise.all([
    prisma.platformInvoice.count({ where }),
    prisma.platformInvoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { barbershop: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    invoices: invoices.map((inv: (typeof invoices)[number]) => ({
      id: inv.id,
      barbershopId: inv.barbershop.id,
      barbershopName: inv.barbershop.name,
      plan: inv.plan,
      amount: inv.amount,
      status: inv.status,
      reason: inv.reason,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
    })),
    total,
    page,
    pageSize,
  });
}
