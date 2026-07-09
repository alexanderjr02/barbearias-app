import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { getRangeScheduleByStaff } from "@/lib/scheduling";

// GET /api/staff/month-schedule?from=YYYY-MM-DD&to=YYYY-MM-DD — every active
// staff member's full schedule (open/closed + hours) for each day in the
// range, batched. Powers the Agenda page's month-view free-hours indicator.
export async function GET(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from e to são obrigatórios" }, { status: 400 });
  }

  const staff = await prisma.staff.findMany({
    where: { barbershopId: session.barbershopId, isActive: true },
    select: { id: true },
  });

  const map = await getRangeScheduleByStaff({
    barbershopId: session.barbershopId,
    staffIds: staff.map((s: { id: string }) => s.id),
    fromDateKey: from,
    toDateKey: to,
  });

  const result: Record<string, Record<string, { isOpen: boolean; openTime: string | null; closeTime: string | null; source: string }>> = {};
  for (const [staffId, dayMap] of map) {
    result[staffId] = Object.fromEntries(dayMap);
  }

  return NextResponse.json(result);
}
