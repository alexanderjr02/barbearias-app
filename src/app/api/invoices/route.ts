import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { issueServiceInvoice, isFiscalProvider, type InvoiceStatus } from "@/lib/fiscal";

const DB_STATUS: Record<InvoiceStatus, string> = {
  processing: "PROCESSING",
  authorized: "AUTHORIZED",
  error: "ERROR",
  cancelled: "CANCELLED",
};

// GET /api/invoices — the barbershop's issued notas fiscais.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const invoices = await prisma.serviceInvoice.findMany({
    where: { barbershopId: session.barbershopId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(invoices);
}

// POST /api/invoices — emit an NFS-e for an appointment (or an ad-hoc sale).
// Body: { appointmentId } OR { amount, clientName, description?, clientDoc? }.
// When the barbershop has a fiscal provider connected, it issues for real;
// otherwise it records a simulated invoice so the flow is testable pre-deploy.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const shop = await prisma.barbershop.findUnique({
    where: { id: session.barbershopId },
    select: { fiscalProvider: true, fiscalApiKey: true, cnpj: true, municipalServiceCode: true, issRate: true },
  });

  // Resolve the invoice data from either an appointment or the raw body.
  let amount = 0;
  let clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  let description = typeof body.description === "string" ? body.description.trim() : "";
  const clientDoc = typeof body.clientDoc === "string" ? body.clientDoc.trim() : null;
  const appointmentId = typeof body.appointmentId === "string" ? body.appointmentId : null;

  if (appointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { barbershopId: true, totalPrice: true, clientName: true, service: { select: { name: true } } },
    });
    if (!appt || appt.barbershopId !== session.barbershopId) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }
    amount = appt.totalPrice;
    clientName = clientName || appt.clientName;
    description = description || `Serviço de barbearia: ${appt.service?.name ?? "atendimento"}`;
  } else {
    amount = Number(body.amount);
    description = description || "Serviço de barbearia";
  }

  if (!(amount > 0) || !clientName) {
    return NextResponse.json({ error: "Informe valor e nome do cliente" }, { status: 400 });
  }

  const invoice = await prisma.serviceInvoice.create({
    data: {
      barbershopId: session.barbershopId,
      appointmentId,
      amount,
      clientName,
      clientDoc,
      status: "PENDING",
    },
  });

  const connected =
    isFiscalProvider(shop?.fiscalProvider) &&
    !!shop?.fiscalApiKey &&
    !!shop?.cnpj &&
    !!shop?.municipalServiceCode &&
    shop?.issRate != null;

  if (connected && shop) {
    const result = await issueServiceInvoice(shop.fiscalProvider as "FOCUSNFE" | "NFEIO", shop.fiscalApiKey!, {
      ref: invoice.id,
      cnpjPrestador: shop.cnpj!,
      municipalServiceCode: shop.municipalServiceCode!,
      issRate: shop.issRate!,
      amount,
      description,
      clientName,
      clientDoc,
    });
    const updated = await prisma.serviceInvoice.update({
      where: { id: invoice.id },
      data: {
        status: DB_STATUS[result.status],
        providerRef: result.providerRef ?? invoice.id,
        number: result.number ?? null,
        pdfUrl: result.pdfUrl ?? null,
        xmlUrl: result.xmlUrl ?? null,
        message: result.message ?? null,
      },
    });
    return NextResponse.json(updated, { status: 201 });
  }

  // Simulated mode — no fiscal provider connected yet.
  const simulated = await prisma.serviceInvoice.update({
    where: { id: invoice.id },
    data: {
      status: "AUTHORIZED",
      number: `SIMULADO-${invoice.id.slice(-6).toUpperCase()}`,
      message: "Emissão simulada. Conecte um provedor fiscal para emitir a nota de verdade.",
    },
  });
  return NextResponse.json({ ...simulated, simulated: true }, { status: 201 });
}
