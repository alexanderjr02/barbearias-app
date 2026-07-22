import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Informe isActive" }, { status: 400 });
  }

  const announcement = await prisma.platformAnnouncement.update({ where: { id }, data: { isActive: body.isActive } });

  await logAdminAction({
    actorId: session.sub,
    action: body.isActive ? "announcement.activated" : "announcement.deactivated",
    targetType: "PlatformAnnouncement",
    targetId: id,
  });

  return NextResponse.json(announcement);
}
