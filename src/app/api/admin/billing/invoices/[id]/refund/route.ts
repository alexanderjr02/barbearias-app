import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

// POST /api/admin/billing/invoices/[id]/refund — a formal reversal of an
// already-PAID invoice, distinct from just marking one FAILED (which means
// "payment never landed"). Creates a Refund record with a reason and moves
// the invoice to REFUNDED, so it drops out of revenue-by-month totals.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body?.reason || typeof body.reason !== "string") {
    return NextResponse.json({ error: "Informe o motivo do reembolso" }, { status: 400 });
  }

  const invoice = await prisma.platformInvoice.findUnique({ where: { id }, include: { refund: true } });
  if (!invoice) {
    return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
  }
  if (invoice.status !== "PAID") {
    return NextResponse.json({ error: "Só é possível reembolsar uma fatura paga" }, { status: 400 });
  }
  if (invoice.refund) {
    return NextResponse.json({ error: "Essa fatura já foi reembolsada" }, { status: 400 });
  }

  const [refund] = await prisma.$transaction([
    prisma.refund.create({
      data: { invoiceId: id, amount: invoice.amount, reason: body.reason, processedBy: session.sub },
    }),
    prisma.platformInvoice.update({ where: { id }, data: { status: "REFUNDED" } }),
  ]);

  await logAdminAction({
    actorId: session.sub,
    action: "invoice.refunded",
    targetType: "PlatformInvoice",
    targetId: id,
    metadata: { amount: invoice.amount, reason: body.reason },
  });

  return NextResponse.json(refund, { status: 201 });
}
