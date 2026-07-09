import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { getEffectiveSchedule } from "@/lib/scheduling";

// GET /api/staff/day-schedule?date=YYYY-MM-DD — every active staff member's
// effective hours for one day (shop default, personal override, or a day
// off), batched in a single call. Powers the Agenda page's "Dia" team view,
// so the gestor can see at a glance who's off before even opening a column.
export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date é obrigatório" }, { status: 400 });
  }

  const staff = await prisma.staff.findMany({
    where: { barbershopId: session.barbershopId, isActive: true },
    select: { id: true },
  });

  const schedules = await Promise.all(
    staff.map(async (s: { id: string }) => ({
      staffId: s.id,
      ...(await getEffectiveSchedule(session.barbershopId, s.id, date)),
    }))
  );

  return NextResponse.json(schedules);
}
