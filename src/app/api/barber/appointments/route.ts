import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { startOfUtcDay } from "@/lib/dateRange";

// GET /api/barber/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD — the logged-in
// barber's own schedule. Requires Role.BARBER linked to a Staff row via
// Staff.userId. Without from/to: today onward, excluding cancelled, capped
// at 50 (the home screen's upcoming list). With from/to: every appointment
// in that range including cancelled (the agenda calendar).
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "BARBER") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const staff = await prisma.staff.findUnique({ where: { userId: session.sub } });
  if (!staff) {
    return NextResponse.json({ error: "Nenhum perfil de barbeiro vinculado a este usuário" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const hasRange = Boolean(from && to);

  const appointments = await prisma.appointment.findMany({
    where: {
      staffId: staff.id,
      ...(hasRange
        ? { date: { gte: new Date(from!), lte: new Date(to!) } }
        : { date: { gte: startOfUtcDay(new Date()) }, status: { not: "CANCELLED" } }),
    },
    include: { service: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    ...(!hasRange && { take: 50 }),
  });

  return NextResponse.json(appointments);
}
