import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/appointments?barbershopId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barbershopId = searchParams.get("barbershopId");

  if (!barbershopId) {
    return NextResponse.json({ error: "barbershopId is required" }, { status: 400 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: { barbershopId },
      include: {
        staff: true,
        service: true,
      },
      orderBy: { date: "desc" },
      take: 50,
    });

    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching appointments" }, { status: 500 });
  }
}

// POST /api/appointments
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
        totalPrice: totalPrice || 0,
        status: "SCHEDULED",
      },
      include: {
        staff: true,
        service: true,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating appointment" }, { status: 500 });
  }
}
