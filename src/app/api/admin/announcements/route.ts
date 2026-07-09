import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

const AUDIENCES = ["ALL", "FREE", "PRO", "ENTERPRISE"] as const;

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }
  const announcements = await prisma.platformAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { dismissals: true } } },
  });
  return NextResponse.json(
    announcements.map((a: (typeof announcements)[number]) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      isActive: a.isActive,
      audience: a.audience,
      dismissedCount: a._count.dismissals,
      createdAt: a.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.body) {
    return NextResponse.json({ error: "Título e mensagem são obrigatórios" }, { status: 400 });
  }
  const audience = AUDIENCES.includes(body.audience) ? body.audience : "ALL";

  const announcement = await prisma.platformAnnouncement.create({
    data: { title: body.title, body: body.body, audience },
  });

  await logAdminAction({ actorId: session.sub, action: "announcement.created", targetType: "PlatformAnnouncement", targetId: announcement.id, metadata: { audience } });

  return NextResponse.json(announcement, { status: 201 });
}
