import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// DELETE /api/client/cuts/[id] — remove a photo from the client's passport.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const cut = await prisma.cutPhoto.findUnique({ where: { id }, select: { clientId: true } });
  if (!cut || cut.clientId !== session.sub) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  await prisma.cutPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
