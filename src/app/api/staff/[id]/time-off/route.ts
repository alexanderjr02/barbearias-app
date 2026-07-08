import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaffScheduleAccess } from "@/lib/apiAuth";
import { shopNow } from "@/lib/scheduling";

// GET /api/staff/{id}/time-off — upcoming blocked days (vacation, folga,
// etc.) for this staff member, soonest first.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireStaffScheduleAccess(id);
  if (!access) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const timeOff = await prisma.staffTimeOff.findMany({
    where: { staffId: id, date: { gte: new Date(shopNow().dateKey) } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(timeOff);
}

// POST /api/staff/{id}/time-off — block a single day. body: { date: "YYYY-MM-DD", reason? }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireStaffScheduleAccess(id);
  if (!access) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.date || typeof body.date !== "string") {
    return NextResponse.json({ error: "date é obrigatório" }, { status: 400 });
  }

  try {
    const timeOff = await prisma.staffTimeOff.create({
      data: { staffId: id, date: new Date(body.date), reason: body.reason || null },
    });
    return NextResponse.json(timeOff, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Esse dia já está bloqueado" }, { status: 409 });
  }
}
