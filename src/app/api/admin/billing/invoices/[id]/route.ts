import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { notify } from "@/lib/notifications";

// PATCH /api/admin/billing/invoices/[id] — manual reconciliation for a
// PENDING/FAILED invoice (there's no real payment gateway to auto-confirm
// this, so the admin marks it by hand once payment is confirmed off-platform).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body || !["PAID", "FAILED"].includes(body.status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const invoice = await prisma.platformInvoice.update({
    where: { id },
    data: { status: body.status, paidAt: body.status === "PAID" ? new Date() : null },
    include: { barbershop: { select: { name: true } } },
  });

  await logAdminAction({
    actorId: session.sub,
    action: "invoice.status_changed",
    targetType: "PlatformInvoice",
    targetId: id,
    metadata: { status: body.status },
  });

  if (body.status === "FAILED") {
    await notify(
      "INVOICE_FAILED",
      `Fatura falhou: ${invoice.barbershop.name}`,
      `A fatura de ${invoice.barbershop.name} (R$ ${invoice.amount.toFixed(2)}) foi marcada como falhada.`,
      { invoiceId: id, barbershopId: invoice.barbershopId }
    );
  }

  return NextResponse.json(invoice);
}
