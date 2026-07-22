import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { buildInvoiceWhere } from "../filters";

const HEADER = ["ID", "Barbearia", "Plano", "Valor (R$)", "Status", "Motivo", "Início do período", "Fim do período", "Pago em", "Criado em"];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDateOnly(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

// GET /api/admin/billing/invoices/export?<same filters as the list> — every
// export is written to the audit log, since a CSV of financial data leaving
// the app is exactly the kind of action that should be traceable later.
export async function GET(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const { searchParams } = new URL(request.url);
  const where = buildInvoiceWhere(searchParams);

  const invoices = await prisma.platformInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { barbershop: { select: { name: true } } },
  });

  const rows = invoices.map((inv: (typeof invoices)[number]) => [
    inv.id,
    inv.barbershop.name,
    inv.plan,
    inv.amount.toFixed(2),
    inv.status,
    inv.reason,
    formatDateOnly(inv.periodStart),
    formatDateOnly(inv.periodEnd),
    formatDateOnly(inv.paidAt),
    formatDateOnly(inv.createdAt),
  ]);

  const csv = [HEADER, ...rows].map((row: string[]) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  await logAdminAction({
    actorId: session.sub,
    action: "billing.invoices_exported",
    targetType: "PlatformInvoice",
    targetId: "bulk",
    metadata: { count: invoices.length, filters: Object.fromEntries(searchParams.entries()) },
  });

  const filename = `faturas-cortix-${new Date().toISOString().slice(0, 10)}.csv`;
  // Leading BOM so Excel opens the file with correct UTF-8 accents instead
  // of guessing a Latin-1-like codepage and mangling barbershop names.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
