import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { id } = await params;

  await prisma.announcementDismissal.upsert({
    where: { announcementId_userId: { announcementId: id, userId: session.sub } },
    create: { announcementId: id, userId: session.sub },
    update: {},
  });

  return NextResponse.json({ dismissed: true });
}
