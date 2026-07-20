import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// DELETE /api/client/waitlist/[id] — leave the waitlist.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.waitlistEntry.findUnique({ where: { id }, select: { clientId: true } });
  if (!entry || entry.clientId !== session.sub) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  await prisma.waitlistEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
