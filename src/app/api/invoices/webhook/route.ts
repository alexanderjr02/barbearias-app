import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchInvoiceStatus, isFiscalProvider, type InvoiceStatus } from "@/lib/fiscal";

const DB_STATUS: Record<InvoiceStatus, string> = {
  processing: "PROCESSING",
  authorized: "AUTHORIZED",
  error: "ERROR",
  cancelled: "CANCELLED",
};

// POST /api/invoices/webhook — fiscal provider callback (Focus NFe posts here
// when a nota changes state). We locate the invoice by our `ref` (= invoice id)
// and re-fetch the authoritative status from the provider.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ref = typeof body?.ref === "string" ? body.ref : typeof body?.reference === "string" ? body.reference : null;
  if (!ref) return NextResponse.json({ ok: true }); // nothing actionable

  const invoice = await prisma.serviceInvoice.findFirst({ where: { OR: [{ id: ref }, { providerRef: ref }] } });
  if (!invoice) return NextResponse.json({ ok: true });

  const shop = await prisma.barbershop.findUnique({
    where: { id: invoice.barbershopId },
    select: { fiscalProvider: true, fiscalApiKey: true },
  });
  if (!isFiscalProvider(shop?.fiscalProvider) || !shop?.fiscalApiKey) {
    return NextResponse.json({ ok: true });
  }

  const result = await fetchInvoiceStatus(shop.fiscalProvider, shop.fiscalApiKey, invoice.providerRef ?? invoice.id);
  await prisma.serviceInvoice.update({
    where: { id: invoice.id },
    data: {
      status: DB_STATUS[result.status],
      number: result.number ?? invoice.number,
      pdfUrl: result.pdfUrl ?? invoice.pdfUrl,
      xmlUrl: result.xmlUrl ?? invoice.xmlUrl,
      message: result.message ?? invoice.message,
    },
  });
  return NextResponse.json({ ok: true });
}
