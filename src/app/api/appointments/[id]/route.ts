import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { awardPointsForAppointment } from "@/lib/loyalty";

const VALID_STATUSES = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

// PATCH /api/appointments/{id} — update status. Allowed for the barbershop's
// gestor/manager, the barber assigned to the appointment (Staff.userId), or
// the client it belongs to (Appointment.clientId) — but a client may only
// cancel, never set any other status (e.g. never mark their own visit
// COMPLETED to fake loyalty points).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({ where: { id }, include: { staff: true } });
  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const isManager = (session.role === "OWNER" || session.role === "MANAGER") && appointment.barbershopId === session.barbershopId;
  const isAssignedBarber = session.role === "BARBER" && appointment.staff.userId === session.sub;
  const isOwnClientCancelling = session.role === "CLIENT" && appointment.clientId === session.sub && body.status === "CANCELLED";
  if (!isManager && !isAssignedBarber && !isOwnClientCancelling) {
    return NextResponse.json({ error: "Sem permissão para alterar este agendamento" }, { status: 403 });
  }

  const updated = await prisma.appointment.update({ where: { id }, data: { status: body.status } });

  if (body.status === "COMPLETED" && appointment.status !== "COMPLETED") {
    await awardPointsForAppointment(id);
  }

  return NextResponse.json(updated);
}
