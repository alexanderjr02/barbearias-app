import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaffScheduleAccess } from "@/lib/apiAuth";

type DayMode = "default" | "custom" | "closed";

interface DayInput {
  dayOfWeek: number;
  mode: DayMode;
  startTime?: string;
  endTime?: string;
}

// GET /api/staff/{id}/availability — this staff member's weekly schedule
// overrides plus the barbershop's default hours, so the UI can show "usa o
// padrão da barbearia" vs a per-day override for each weekday.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireStaffScheduleAccess(id);
  if (!access) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const [availability, shopHours] = await Promise.all([
    prisma.availability.findMany({ where: { staffId: id }, orderBy: { dayOfWeek: "asc" } }),
    prisma.workingHour.findMany({ where: { barbershopId: access.staff.barbershopId }, orderBy: { dayOfWeek: "asc" } }),
  ]);

  return NextResponse.json({ availability, shopHours });
}

// PUT /api/staff/{id}/availability — replaces the staff's weekly overrides.
// body: { days: DayInput[] } — "default" removes any override for that
// weekday (falls back to the shop's hours), "custom" sets the staff's own
// open/close, "closed" marks the staff as off that weekday regardless of
// the shop's hours.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireStaffScheduleAccess(id);
  if (!access) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const days: DayInput[] = Array.isArray(body?.days) ? body.days : [];

  await Promise.all(
    days.map((day) => {
      if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) return null;

      if (day.mode === "default") {
        return prisma.availability.deleteMany({ where: { staffId: id, dayOfWeek: day.dayOfWeek } });
      }

      const isAvailable = day.mode === "custom";
      const startTime = isAvailable ? day.startTime || "09:00" : "00:00";
      const endTime = isAvailable ? day.endTime || "18:00" : "00:00";

      return prisma.availability.upsert({
        where: { staffId_dayOfWeek: { staffId: id, dayOfWeek: day.dayOfWeek } },
        create: { staffId: id, dayOfWeek: day.dayOfWeek, isAvailable, startTime, endTime },
        update: { isAvailable, startTime, endTime },
      });
    })
  );

  const availability = await prisma.availability.findMany({ where: { staffId: id }, orderBy: { dayOfWeek: "asc" } });
  return NextResponse.json({ availability });
}
