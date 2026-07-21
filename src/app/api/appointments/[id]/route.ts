import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runLoyaltyOnCompletion } from "@/lib/loyalty";
import { notifyBarbershop, notifyClient } from "@/lib/gestorNotifications";
import { onSlotOpened } from "@/lib/copilot/autopilot";
import { validateRequestedSlot } from "@/lib/scheduling";

const VALID_STATUSES = ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

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
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }
  // status is optional now: the barber's "finalizar atendimento" sheet can
  // also just save the result photo / recipe (ficha técnica) without a status
  // change. But if status IS sent, it must be valid.
  const hasStatus = typeof body.status === "string";
  if (hasStatus && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  // Fields a barber/gestor may set on checkout: the "depois" photo and the
  // cut recipe (ficha técnica). Only strings, only when present.
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const extras: Record<string, string | null> = {};
  for (const key of ["resultPhoto", "recipeMachine", "recipeFinish", "recipeProducts", "recipeNotes"] as const) {
    if (key in body) extras[key] = str(body[key]) ?? null;
  }
  const hasExtras = Object.keys(extras).length > 0;
  // Arrastar-e-soltar: trocar de barbeiro (day view) e/ou remarcar de dia
  // (week view). Independentes — um, outro, ou os dois.
  const wantsStaffChange = typeof body.staffId === "string" && body.staffId.trim().length > 0;
  const wantsDateChange = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date);
  if (!hasStatus && !hasExtras && !wantsStaffChange && !wantsDateChange) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
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
  // A client may only ever flip their own appointment to CANCELLED — never
  // touch the photo/recipe (those belong to whoever cut the hair).
  if (isOwnClientCancelling && hasExtras) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const data: Record<string, unknown> = { ...(isOwnClientCancelling ? {} : extras) };
  if (hasStatus) data.status = body.status;

  // Trocar de barbeiro e/ou remarcar de dia: só gestor/gerente ou o próprio
  // barbeiro do horário. Um novo barbeiro tem que ser DESTA barbearia.
  if (wantsStaffChange || wantsDateChange) {
    if (!isManager && !isAssignedBarber) {
      return NextResponse.json({ error: "Sem permissão para mover este agendamento" }, { status: 403 });
    }

    const currentDateKey = appointment.date.toISOString().slice(0, 10);
    const targetStaffId = wantsStaffChange ? (body.staffId as string) : appointment.staffId;
    const targetDateKey = wantsDateChange ? (body.date as string) : currentDateKey;
    const staffChanged = targetStaffId !== appointment.staffId;
    const dateChanged = targetDateKey !== currentDateKey;

    if (staffChanged) {
      const newStaff = await prisma.staff.findUnique({ where: { id: targetStaffId }, select: { barbershopId: true, isActive: true } });
      if (!newStaff || newStaff.barbershopId !== appointment.barbershopId) {
        return NextResponse.json({ error: "Barbeiro não encontrado nesta barbearia" }, { status: 404 });
      }
      if (!newStaff.isActive) {
        return NextResponse.json({ error: "Esse barbeiro está inativo" }, { status: 409 });
      }
    }

    // A "tratação" que evita quebrar a agenda: o barbeiro de destino precisa
    // atender no dia/horário e estar LIVRE naquele intervalo — senão dois
    // clientes cairiam no mesmo barbeiro na mesma hora. ignorePast só quando
    // NÃO muda a data (trocar de barbeiro no mesmo dia não é "agendar de
    // novo"); ao remarcar para outro dia, a data nova tem que ser válida.
    if (staffChanged || dateChanged) {
      const slotError = await validateRequestedSlot({
        barbershopId: appointment.barbershopId,
        staffId: targetStaffId,
        dateKey: targetDateKey,
        startTime: appointment.startTime,
        endTime: appointment.endTime || appointment.startTime,
        ignorePast: !dateChanged,
      });
      if (slotError) {
        return NextResponse.json({ error: slotError }, { status: 409 });
      }
    }

    if (staffChanged) data.staffId = targetStaffId;
    if (dateChanged) data.date = new Date(targetDateKey);
  }

  const updated = await prisma.appointment.update({ where: { id }, data });

  // The "depois" photo just landed → drop a copy into the client's Carteira de
  // Cortes (only when it's newly set and the client has an account).
  const newResultPhoto = extras.resultPhoto;
  if (newResultPhoto && newResultPhoto !== appointment.resultPhoto && appointment.clientId) {
    const shop = await prisma.barbershop.findUnique({ where: { id: appointment.barbershopId }, select: { name: true } });
    await prisma.cutPhoto.create({
      data: {
        clientId: appointment.clientId,
        barbershopId: appointment.barbershopId,
        imageUrl: newResultPhoto,
        note: shop?.name ? `Feito na ${shop.name}` : "Meu corte",
      },
    });
  }

  if (body.status === "COMPLETED" && appointment.status !== "COMPLETED") {
    await runLoyaltyOnCompletion(id);
  }

  if (isOwnClientCancelling) {
    await notifyBarbershop(
      appointment.barbershopId,
      "APPOINTMENT_CANCELLED",
      "Agendamento cancelado",
      `${appointment.clientName} cancelou o agendamento das ${appointment.startTime}`,
      "/dashboard/appointments"
    );
  }

  // Mirror of the above: staff changing a status the client cares about
  // notifies the client, but only if it's an actual transition and the
  // client didn't just do it themselves (no need to notify someone of their
  // own cancellation).
  if ((isManager || isAssignedBarber) && appointment.clientId && appointment.status !== body.status) {
    const CLIENT_MESSAGES: Record<string, [string, string]> = {
      CONFIRMED: ["Agendamento confirmado", `Sua barbearia confirmou seu agendamento das ${appointment.startTime}`],
      ARRIVED: ["Check-in feito", `Recebemos você! Já já é a sua vez.`],
      IN_PROGRESS: ["É a sua vez", `Seu atendimento das ${appointment.startTime} começou.`],
      CANCELLED: ["Agendamento cancelado", `Sua barbearia cancelou seu agendamento das ${appointment.startTime}`],
      COMPLETED: ["Como foi o corte?", `Atendimento concluído! Avalie o Thalles e já garanta seu próximo horário.`.replace("Thalles", appointment.staff.name)],
    };
    const CLIENT_TYPE: Record<string, "APPOINTMENT_CONFIRMED" | "APPOINTMENT_CANCELLED_BY_SHOP" | "APPOINTMENT_COMPLETED"> = {
      CONFIRMED: "APPOINTMENT_CONFIRMED",
      ARRIVED: "APPOINTMENT_CONFIRMED",
      IN_PROGRESS: "APPOINTMENT_CONFIRMED",
      CANCELLED: "APPOINTMENT_CANCELLED_BY_SHOP",
      COMPLETED: "APPOINTMENT_COMPLETED",
    };
    const entry = CLIENT_MESSAGES[body.status];
    if (entry) {
      await notifyClient(appointment.barbershopId, appointment.clientId, CLIENT_TYPE[body.status], entry[0], entry[1], "/appointments");
    }
  }

  // Auto-piloto (tempo real 24/7): abriu um horário → preenche na hora (fila +
  // clientes sumidos) e registra a receita recuperada.
  if (body.status === "CANCELLED" && appointment.status !== "CANCELLED") {
    const svc = await prisma.service.findUnique({ where: { id: appointment.serviceId }, select: { price: true } });
    await onSlotOpened(appointment.barbershopId, { startTime: appointment.startTime, price: svc?.price ?? appointment.totalPrice });
  }

  return NextResponse.json(updated);
}
