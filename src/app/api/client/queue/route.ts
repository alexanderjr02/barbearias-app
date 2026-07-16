import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { shopNow } from "@/lib/scheduling";

// Statuses that still hold a place in the day's line (not yet finished).
const PENDING = ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"];

// GET /api/client/queue?appointmentId= — live queue info for the client's own
// appointment: how many people are ahead, a rough wait estimate, and the
// current status (so the app can update itself without a manual refresh).
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const appointmentId = request.nextUrl.searchParams.get("appointmentId");
  if (!appointmentId) return NextResponse.json({ error: "appointmentId obrigatório" }, { status: 400 });

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: { select: { duration: true } } },
  });
  if (!appt || appt.clientId !== session.sub) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const now = shopNow();
  const myDateKey = `${appt.date.getUTCFullYear()}-${String(appt.date.getUTCMonth() + 1).padStart(2, "0")}-${String(appt.date.getUTCDate()).padStart(2, "0")}`;
  const isToday = myDateKey === now.dateKey;
  const active = PENDING.includes(appt.status);

  // Only appointments earlier in the same day, same barber, still pending
  // count as "ahead of you". Completed/cancelled ones already left the line.
  const dayStart = new Date(`${myDateKey}T00:00:00.000Z`);
  const dayEnd = new Date(`${myDateKey}T23:59:59.999Z`);
  const siblings = await prisma.appointment.findMany({
    where: {
      staffId: appt.staffId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: PENDING },
      id: { not: appt.id },
    },
    select: { startTime: true, service: { select: { duration: true } } },
  });

  const ahead = siblings.filter((s: { startTime: string }) => s.startTime < appt.startTime);
  const etaMinutes = ahead.reduce((acc: number, s: { service: { duration: number } | null }) => acc + (s.service?.duration ?? 30), 0);

  return NextResponse.json({
    status: appt.status,
    isToday,
    active,
    position: appt.status === "IN_PROGRESS" ? 0 : ahead.length + 1,
    ahead: ahead.length,
    etaMinutes,
  });
}
