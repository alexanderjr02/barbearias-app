import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { validateRequestedSlot } from "@/lib/scheduling";
import { notifyBarbershop } from "@/lib/gestorNotifications";
import { sendBookingConfirmation } from "@/lib/whatsapp";
import { appointmentLimitError } from "@/lib/planLimits";

// GET /api/appointments?barbershopId=xxx&staffId=yyy&from=YYYY-MM-DD&to=YYYY-MM-DD
// staffId optional (a gestor viewing a single barber's agenda). from/to are
// optional too — when given, returns every appointment in that date range
// (used by the calendar week/month views); otherwise falls back to the 50
// most recent, for callers that just want a quick recent-activity snapshot.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barbershopId = searchParams.get("barbershopId");
  const staffId = searchParams.get("staffId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const hasRange = Boolean(from && to);

  if (!barbershopId) {
    return NextResponse.json({ error: "barbershopId is required" }, { status: 400 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        barbershopId,
        ...(staffId && { staffId }),
        ...(hasRange && { date: { gte: new Date(from!), lte: new Date(to!) } }),
      },
      include: {
        staff: true,
        service: true,
        client: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { date: hasRange ? "asc" : "desc" },
      ...(!hasRange && { take: 50 }),
    });

    return NextResponse.json(appointments);
  } catch {
    return NextResponse.json({ error: "Error fetching appointments" }, { status: 500 });
  }
}

// POST /api/appointments — open to guest bookings (public booking wizard).
// When called with a logged-in session, the appointment is automatically
// linked to that account (clientId) so loyalty points and "my appointments"
// pick it up, regardless of who is named as the contact.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      barbershopId,
      staffId,
      serviceId,
      date,
      startTime,
      endTime,
      clientName,
      clientPhone,
      clientEmail,
      totalPrice,
      referencePhoto,
    } = body;

    if (!barbershopId || !staffId || !serviceId || !date || !startTime || !clientName || !clientPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // O PREÇO VEM DO BANCO, NUNCA DO PEDIDO.
    //
    // Antes era `totalPrice: totalPrice || 0`, direto do corpo da requisição.
    // Isso tinha dois problemas de dinheiro:
    //
    // 1. App com preço antigo em cache agendava pelo valor velho, e a
    //    barbearia comia a diferença;
    // 2. pior, qualquer um podia mandar `totalPrice: 0` e agendar de graça —
    //    basta abrir o console do navegador.
    //
    // Buscar o serviço aqui resolve os dois: o valor cobrado é sempre o que
    // está cadastrado agora, independente do que o app achava que era.
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { price: true, duration: true, barbershopId: true, isActive: true },
    });

    if (!service || service.barbershopId !== barbershopId) {
      return NextResponse.json({ error: "Serviço não encontrado nesta barbearia" }, { status: 404 });
    }
    if (!service.isActive) {
      return NextResponse.json({ error: "Esse serviço não está mais disponível" }, { status: 409 });
    }

    const slotError = await validateRequestedSlot({
      barbershopId,
      staffId,
      dateKey: date,
      startTime,
      endTime: endTime || startTime,
    });
    if (slotError) {
      return NextResponse.json({ error: slotError }, { status: 409 });
    }

    // Plan limit — the barbershop's monthly appointment quota.
    const limitError = await appointmentLimitError(barbershopId);
    if (limitError) {
      return NextResponse.json({ error: limitError }, { status: 403 });
    }

    const session = await getSession();
    // Only a CLIENT's own session auto-links the appointment to their
    // account — a staff member (owner/manager/barber) booking a walk-in on
    // someone else's behalf must never have the booking attributed to them.
    const selfBookingClientId = session?.role === "CLIENT" ? session.sub : undefined;

    const appointment = await prisma.appointment.create({
      data: {
        barbershopId,
        staffId,
        serviceId,
        date: new Date(date),
        startTime,
        endTime: endTime || startTime,
        clientName,
        clientPhone,
        clientEmail,
        clientId: selfBookingClientId,
        totalPrice: service.price,
        status: "SCHEDULED",
        referencePhoto: typeof referencePhoto === "string" && referencePhoto.trim() ? referencePhoto.trim() : null,
      },
      include: {
        staff: true,
        service: true,
        barbershop: { select: { name: true } },
      },
    });

    // A staff member booking a walk-in never notifies themselves — only a
    // client (logged in or guest) creating their own appointment does.
    const isClientInitiated = !session || session.role === "CLIENT";
    if (isClientInitiated) {
      await notifyBarbershop(
        barbershopId,
        "NEW_APPOINTMENT",
        "Novo agendamento",
        `${clientName} agendou ${appointment.service.name} às ${startTime}`,
        "/dashboard/appointments"
      );
    }

    // Best-effort WhatsApp confirmation to the client — never let a messaging
    // failure (or missing config) break the booking itself.
    try {
      const iso = String(date).slice(0, 10);
      const [y, m, d] = iso.split("-");
      const dateLabel = d && m && y ? `${d}/${m}/${y}` : iso;
      await sendBookingConfirmation(clientPhone, {
        clientName,
        barbershopName: appointment.barbershop.name,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
        dateLabel,
        startTime,
      });
    } catch (err) {
      console.error("[appointments] WhatsApp confirmation failed", err);
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error creating appointment" }, { status: 500 });
  }
}
