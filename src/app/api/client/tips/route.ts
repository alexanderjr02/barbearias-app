import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notifyBarbershop } from "@/lib/gestorNotifications";

// GET /api/client/tips?appointmentId= — what the tip screen needs: the shop's
// PIX key, the barber's name, and whether a tip was already left.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const appointmentId = request.nextUrl.searchParams.get("appointmentId");
  if (!appointmentId) return NextResponse.json({ error: "appointmentId obrigatório" }, { status: 400 });

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barbershop: { select: { name: true, pixKey: true } }, staff: { select: { name: true } }, tip: true },
  });
  if (!appt || appt.clientId !== session.sub) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    shopName: appt.barbershop.name,
    barberName: appt.staff.name,
    pixKey: appt.barbershop.pixKey,
    hasTip: !!appt.tip,
    amount: appt.tip?.amount ?? null,
  });
}

// POST /api/client/tips { appointmentId, amount } — record a digital tip. The
// money moves via the shop's PIX (outside the app); we only log the intent so
// the barber sees it in Ganhos and can confirm receipt.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const appointmentId: string | undefined = body?.appointmentId;
  const amount = Number(body?.amount);
  if (!appointmentId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { tip: true } });
  if (!appt || appt.clientId !== session.sub) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (appt.status !== "COMPLETED") {
    return NextResponse.json({ error: "Só é possível dar gorjeta após o atendimento" }, { status: 400 });
  }
  if (appt.tip) return NextResponse.json({ error: "Gorjeta já registrada" }, { status: 409 });

  const tip = await prisma.tip.create({
    data: { appointmentId, staffId: appt.staffId, barbershopId: appt.barbershopId, amount },
  });
  await notifyBarbershop(
    appt.barbershopId,
    "NEW_APPOINTMENT",
    "Gorjeta recebida 💸",
    `${appt.clientName} deixou R$ ${amount.toFixed(2)} de gorjeta`,
    "/dashboard"
  );
  return NextResponse.json(tip, { status: 201 });
}
