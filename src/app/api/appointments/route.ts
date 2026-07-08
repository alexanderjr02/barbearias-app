import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { validateRequestedSlot } from "@/lib/scheduling";

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
    } = body;

    if (!barbershopId || !staffId || !serviceId || !date || !startTime || !clientName || !clientPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    const session = await getSession();

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
        clientId: session?.sub,
        totalPrice: totalPrice || 0,
        status: "SCHEDULED",
      },
      include: {
        staff: true,
        service: true,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error creating appointment" }, { status: 500 });
  }
}
