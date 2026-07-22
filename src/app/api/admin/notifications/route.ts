import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";

// GET /api/admin/notifications?type=&page=&pageSize= — the log of everything
// that WOULD have gone out over email (see src/lib/notifications.ts).
export async function GET(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 30));

  const where = type && type !== "ALL" ? { type } : {};

  const [total, logs] = await Promise.all([
    prisma.notificationLog.count({ where }),
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    logs: logs.map((l: (typeof logs)[number]) => ({ ...l, metadata: l.metadata ? JSON.parse(l.metadata) : null })),
    total,
    page,
    pageSize,
  });
}
