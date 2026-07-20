import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { aiSpendThisMonth, aiQuota } from "@/lib/ai/usage";

// GET /api/copilot/ai-usage — this shop's AI spend this month + today's quota.
// The margin dashboard: what the Copiloto/assistant is costing and how much of
// the daily cap is left. Lets you (and the gestor) see cost, never be surprised.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  const [month, quota] = await Promise.all([aiSpendThisMonth(session.barbershopId), aiQuota(session.barbershopId, shop?.plan)]);
  return NextResponse.json({ month, quota, plan: shop?.plan ?? "FREE" });
}
