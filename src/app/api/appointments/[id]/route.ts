import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runLoyaltyOnCompletion } from "@/lib/loyalty";
import { notifyBarbershop, notifyClient } from "@/lib/gestorNotifications";
import { onSlotOpened } from "@/lib/copilot/autopilot";
import { validateRequestedSlot } from "@/lib/scheduling";
import { advanceLead } from "@/lib/attribution";

const VALID_STATUSES = ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

// Aritmética de "HH:MM" para o arraste que muda o horário (mantém a duração).
function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function minutesBetween(a: string, b: string): number {
  return Math.max(toMin(b) - toMin(a), 0);
}
function addDurationLabel(start: string, dur: number): string {
  return toLabel(toMin(start) + Math.max(dur, 0));
}

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
  // Arrastar-e-soltar: trocar de barbeiro (coluna), remarcar de dia e/ou mudar
  // de horário (altura). Combináveis — soltar numa posição pode mudar os três.
  const wantsStaffChange = typeof body.staffId === "string" && body.staffId.trim().length > 0;
  const wantsDateChange = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date);
  const wantsTimeChange = typeof body.startTime === "string" && /^\d{2}:\d{2}$/.test(body.startTime);
  if (!hasStatus && !hasExtras && !wantsStaffChange && !wantsDateChange && !wantsTimeChange) {
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

  // Mover o agendamento (barbeiro, dia e/ou horário): só gestor/gerente ou o
  // próprio barbeiro do horário. Um novo barbeiro tem que ser DESTA barbearia.
  if (wantsStaffChange || wantsDateChange || wantsTimeChange) {
    if (!isManager && !isAssignedBarber) {
      return NextResponse.json({ error: "Sem permissão para mover este agendamento" }, { status: 403 });
    }

    const currentDateKey = appointment.date.toISOString().slice(0, 10);
    const targetStaffId = wantsStaffChange ? (body.staffId as string) : appointment.staffId;
    const targetDateKey = wantsDateChange ? (body.date as string) : currentDateKey;
    const targetStartTime = wantsTimeChange ? (body.startTime as string) : appointment.startTime;
    // endTime novo (mantém a duração): o front manda; se não vier, calcula pela
    // duração original a partir do novo início.
    const targetEndTime =
      wantsTimeChange && typeof body.endTime === "string" && /^\d{2}:\d{2}$/.test(body.endTime)
        ? (body.endTime as string)
        : wantsTimeChange
          ? addDurationLabel(targetStartTime, minutesBetween(appointment.startTime, appointment.endTime || appointment.startTime))
          : appointment.endTime || appointment.startTime;
    const staffChanged = targetStaffId !== appointment.staffId;
    const dateChanged = targetDateKey !== currentDateKey;
    const timeChanged = targetStartTime !== appointment.startTime || targetEndTime !== (appointment.endTime || appointment.startTime);

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
    if (staffChanged || dateChanged || timeChanged) {
      // force = "encaixar mesmo assim": o gestor decidiu sobrepor. Pula só o
      // choque de horário; folga, expediente e passado continuam barrando.
      const force = body.force === true;
      const slotError = await validateRequestedSlot({
        barbershopId: appointment.barbershopId,
        staffId: targetStaffId,
        dateKey: targetDateKey,
        startTime: targetStartTime,
        endTime: targetEndTime,
        // Só ignora o "já passou" num puro trocar-de-barbeiro no mesmo dia/hora;
        // mudar a data ou o horário exige um alvo válido (não no passado).
        ignorePast: !dateChanged && !timeChanged,
        allowOverlap: force,
        // Exclui o próprio agendamento do choque: ao mudar SÓ o horário no
        // mesmo barbeiro, ele não pode "colidir consigo mesmo".
        excludeId: appointment.id,
      });
      if (slotError) {
        const code = slotError.includes("ocupado") ? "SLOT_TAKEN" : undefined;
        return NextResponse.json({ error: slotError, code }, { status: 409 });
      }
    }

    if (staffChanged) data.staffId = targetStaffId;
    if (dateChanged) data.date = new Date(targetDateKey);
    if (timeChanged) {
      data.startTime = targetStartTime;
      data.endTime = targetEndTime;
    }
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
    // Atribuição (Onda 1): compareceu → avança o funil do lead para SHOWED. É a
    // etapa que separa "o anúncio traz gente" de "a gente que chega vira
    // cliente". Best-effort: nunca quebra a conclusão do atendimento.
    try {
      await advanceLead(appointment.barbershopId, appointment.clientPhone, "SHOWED", {
        clientId: appointment.clientId,
        showedAt: new Date(),
        value: appointment.totalPrice,
      });
    } catch (e) {
      console.error("[appointments] advanceLead SHOWED", e);
    }
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

// DELETE /api/appointments/{id} — apaga de vez (diferente de cancelar, que
// deixa o registro riscado na agenda). Só gestor/gerente da barbearia ou o
// barbeiro do próprio horário.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { id }, include: { staff: true } });
  if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  const isManager = (session.role === "OWNER" || session.role === "MANAGER") && appointment.barbershopId === session.barbershopId;
  const isAssignedBarber = session.role === "BARBER" && appointment.staff.userId === session.sub;
  if (!isManager && !isAssignedBarber) {
    return NextResponse.json({ error: "Sem permissão para excluir este agendamento" }, { status: 403 });
  }

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
