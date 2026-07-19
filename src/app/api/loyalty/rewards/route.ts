import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { redeemReward } from "@/lib/loyalty/engine";

// GET  /api/loyalty/rewards — prêmios a resgatar na barbearia (fila do balcão)
// POST /api/loyalty/rewards { rewardId } — gestor baixa o prêmio
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const rows = await prisma.loyaltyReward.findMany({
    where: { barbershopId: session.barbershopId, status: "AVAILABLE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, source: true, createdAt: true, user: { select: { name: true, phone: true } } },
  });
  type R = { id: string; label: string; source: string; createdAt: Date; user: { name: string; phone: string | null } | null };
  return NextResponse.json({
    rewards: (rows as R[]).map((r) => ({
      id: r.id, label: r.label, source: r.source, createdAt: r.createdAt,
      clientName: r.user?.name ?? "Cliente", clientPhone: r.user?.phone ?? "",
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const rewardId = String(body?.rewardId ?? "");
  if (!rewardId) return NextResponse.json({ error: "Informe o prêmio" }, { status: 400 });
  const result = await redeemReward(rewardId, session.barbershopId);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ message: result.message });
}
