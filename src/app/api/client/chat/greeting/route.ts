import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { planHasAI } from "@/lib/billing";
import { clientProactiveOpener } from "@/lib/copilot/clientAgent";

// GET /api/client/chat/greeting?barbershopId= — the proactive opener for the
// logged-in client's assistant. The "agente que se antecipa": when the client
// is due for a cut, it proposes the next slot (their usual service/barber/time)
// before they ask. Shown only when the chat has no history yet.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ greeting: "", proactive: false, suggestion: null });
  const barbershopId = request.nextUrl.searchParams.get("barbershopId");
  if (!barbershopId) return NextResponse.json({ greeting: "", proactive: false, suggestion: null });

  const [shop, user] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true } }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } }),
  ]);
  // Personalized AI opener is a Pro+ perk; on other plans, no proactive nudge.
  if (!planHasAI(shop?.plan)) return NextResponse.json({ greeting: "", proactive: false, suggestion: null });

  const firstName = (user?.name ?? "").split(" ")[0] ?? "";
  try {
    const opener = await clientProactiveOpener(barbershopId, session.sub, firstName);
    return NextResponse.json(opener);
  } catch {
    return NextResponse.json({ greeting: "", proactive: false, suggestion: null });
  }
}
