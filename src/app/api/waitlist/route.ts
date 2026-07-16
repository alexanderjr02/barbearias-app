import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// GET /api/waitlist — the barbershop's current waiting queue (oldest first).
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const entries = await prisma.waitlistEntry.findMany({
    where: { barbershopId: session.barbershopId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(entries);
}

// POST /api/waitlist { clientName, clientPhone, note? } — add someone to the queue.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const clientName = typeof body?.clientName === "string" ? body.clientName.trim() : "";
  const clientPhone = typeof body?.clientPhone === "string" ? body.clientPhone.trim() : "";
  if (!clientName || !clientPhone) {
    return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
  }
  const entry = await prisma.waitlistEntry.create({
    data: {
      barbershopId: session.barbershopId,
      clientName,
      clientPhone,
      note: typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
