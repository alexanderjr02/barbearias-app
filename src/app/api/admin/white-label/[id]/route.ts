import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

const STATUSES = ["REQUESTED", "IN_PROGRESS", "DELIVERED"] as const;

// PATCH /api/admin/white-label/[id] — [id] is the WhiteLabelRequest id.
// Manual status advance + notes; this is an honest queue the admin works by
// hand, not an automated build pipeline (none exists in this app).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const data: { status?: string; notes?: string } = {};
  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.notes === "string") {
    data.notes = body.notes;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const updated = await prisma.whiteLabelRequest.update({ where: { id }, data });

  await logAdminAction({
    actorId: session.sub,
    action: "white_label.status_changed",
    targetType: "WhiteLabelRequest",
    targetId: id,
    metadata: data,
  });

  return NextResponse.json(updated);
}
