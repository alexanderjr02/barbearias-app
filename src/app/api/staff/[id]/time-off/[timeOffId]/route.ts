import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaffScheduleAccess } from "@/lib/apiAuth";

// DELETE /api/staff/{id}/time-off/{timeOffId} — unblock a day.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; timeOffId: string }> }) {
  const { id, timeOffId } = await params;
  const access = await requireStaffScheduleAccess(id);
  if (!access) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const timeOff = await prisma.staffTimeOff.findUnique({ where: { id: timeOffId } });
  if (!timeOff || timeOff.staffId !== id) {
    return NextResponse.json({ error: "Bloqueio não encontrado" }, { status: 404 });
  }

  await prisma.staffTimeOff.delete({ where: { id: timeOffId } });
  return NextResponse.json({ ok: true });
}
