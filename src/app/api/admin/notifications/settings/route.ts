import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { NOTIFICATION_TYPES } from "@/lib/notifications";

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const rows = await prisma.notificationSetting.findMany();
  const enabledByType = new Map(rows.map((r: { type: string; enabled: boolean }) => [r.type, r.enabled]));

  return NextResponse.json(NOTIFICATION_TYPES.map((type) => ({ type, enabled: enabledByType.get(type) ?? true })));
}

export async function PATCH(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.type || !NOTIFICATION_TYPES.includes(body.type) || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await prisma.notificationSetting.upsert({
    where: { type: body.type },
    create: { type: body.type, enabled: body.enabled },
    update: { enabled: body.enabled },
  });

  return NextResponse.json({ type: body.type, enabled: body.enabled });
}
