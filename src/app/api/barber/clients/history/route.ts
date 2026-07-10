import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/barber/clients/history?appointmentId=X — for the logged-in barber,
// the full visit history (within their own barbershop) of the client behind
// a given appointment. Matches by clientId when the client has an account,
// falling back to clientEmail for guest bookings made pre-signup.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "BARBER") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const appointmentId = new URL(request.url).searchParams.get("appointmentId");
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId é obrigatório" }, { status: 400 });
  }

  const reference = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!reference || reference.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  // Prefer matching by account id (most precise); fall back to email, then
  // phone, for guest bookings made without an account.
  const identity = reference.clientId
    ? { clientId: reference.clientId }
    : reference.clientEmail
      ? { clientEmail: reference.clientEmail }
      : { clientPhone: reference.clientPhone };

  const appointments = await prisma.appointment.findMany({
    where: { barbershopId: session.barbershopId, ...identity },
    include: { service: { select: { name: true } }, staff: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 20,
  });

  type AppointmentRow = (typeof appointments)[number];
  const completed = appointments.filter((a: AppointmentRow) => a.status === "COMPLETED");

  return NextResponse.json({
    clientName: reference.clientName,
    totalVisits: completed.length,
    totalSpent: completed.reduce((acc: number, a: AppointmentRow) => acc + a.totalPrice, 0),
    appointments,
  });
}
