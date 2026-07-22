import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";

// GET /api/admin/audit-log?actor=&action=&targetType=&page=&pageSize=
export async function GET(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const { searchParams } = new URL(request.url);
  const actor = searchParams.get("actor")?.trim() ?? "";
  const action = searchParams.get("action");
  const targetType = searchParams.get("targetType");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 30));

  const where = {
    ...(action && action !== "ALL" ? { action: { contains: action } } : {}),
    ...(targetType && targetType !== "ALL" ? { targetType } : {}),
    ...(actor ? { actor: { OR: [{ name: { contains: actor } }, { email: { contains: actor } }] } } : {}),
  };

  const [total, logs, distinctTargetTypes] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.findMany({ distinct: ["targetType"], select: { targetType: true } }),
  ]);

  return NextResponse.json({
    logs: logs.map((l: (typeof logs)[number]) => ({
      id: l.id,
      actorName: l.actor.name,
      actorEmail: l.actor.email,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      createdAt: l.createdAt,
    })),
    total,
    page,
    pageSize,
    targetTypes: distinctTargetTypes.map((t: { targetType: string }) => t.targetType),
  });
}
