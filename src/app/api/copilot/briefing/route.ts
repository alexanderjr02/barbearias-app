import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { planHasAI } from "@/lib/billing";
import { buildBriefing } from "@/lib/copilot/insights";

// GET /api/copilot/briefing — the proactive "bom dia" panel for the gestor:
// churned clients, empty slots today, unconfirmed appointments, low stock and
// the week's revenue, each with a one-tap action id. Pro+ feature.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  if (!planHasAI(shop?.plan)) return NextResponse.json({ cards: [], locked: true });
  const briefing = await buildBriefing(session.barbershopId);
  return NextResponse.json(briefing);
}
