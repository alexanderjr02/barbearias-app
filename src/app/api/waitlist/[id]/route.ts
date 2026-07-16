import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// DELETE /api/waitlist/[id] — remove someone from the queue (attended or gave up).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;
  const entry = await prisma.waitlistEntry.findUnique({ where: { id }, select: { barbershopId: true } });
  if (!entry || entry.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  await prisma.waitlistEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
