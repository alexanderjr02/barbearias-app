import { NextRequest, NextResponse } from "next/server";
import { buildDaySlots } from "@/lib/scheduling";

// GET /api/appointments/slots?barbershopId=&staffId=&date=YYYY-MM-DD&duration=45
// Real, server-computed bookable times for one staff member on one day —
// respects the shop/staff's working hours, days off, already-booked
// appointments, and (for today) the current time. Used by the "Novo
// Agendamento" wizard instead of a fixed list of times.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barbershopId = searchParams.get("barbershopId");
  const staffId = searchParams.get("staffId");
  const date = searchParams.get("date");
  const duration = Number(searchParams.get("duration"));

  if (!barbershopId || !staffId || !date || !duration || duration <= 0) {
    return NextResponse.json({ error: "barbershopId, staffId, date e duration são obrigatórios" }, { status: 400 });
  }

  try {
    const { schedule, slots } = await buildDaySlots({
      barbershopId,
      staffId,
      dateKey: date,
      durationMinutes: duration,
    });
    return NextResponse.json({ ...schedule, slots });
  } catch {
    return NextResponse.json({ error: "Erro ao calcular horários disponíveis" }, { status: 500 });
  }
}
