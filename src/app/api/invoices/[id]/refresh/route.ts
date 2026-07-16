import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { fetchInvoiceStatus, isFiscalProvider, type InvoiceStatus } from "@/lib/fiscal";

const DB_STATUS: Record<InvoiceStatus, string> = {
  processing: "PROCESSING",
  authorized: "AUTHORIZED",
  error: "ERROR",
  cancelled: "CANCELLED",
};

// POST /api/invoices/[id]/refresh — re-check the nota status at the provider.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  const invoice = await prisma.serviceInvoice.findUnique({ where: { id } });
  if (!invoice || invoice.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
  }

  const shop = await prisma.barbershop.findUnique({
    where: { id: session.barbershopId },
    select: { fiscalProvider: true, fiscalApiKey: true },
  });
  if (!isFiscalProvider(shop?.fiscalProvider) || !shop?.fiscalApiKey) {
    return NextResponse.json(invoice); // simulated / not connected — nothing to poll
  }

  const result = await fetchInvoiceStatus(shop.fiscalProvider, shop.fiscalApiKey, invoice.providerRef ?? invoice.id);
  const updated = await prisma.serviceInvoice.update({
    where: { id },
    data: {
      status: DB_STATUS[result.status],
      number: result.number ?? invoice.number,
      pdfUrl: result.pdfUrl ?? invoice.pdfUrl,
      xmlUrl: result.xmlUrl ?? invoice.xmlUrl,
      message: result.message ?? invoice.message,
    },
  });
  return NextResponse.json(updated);
}
