import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { planHasAI } from "@/lib/billing";
import { copilotGreeting, type CopilotRole } from "@/lib/chatbot/copilot";

// GET /api/copilot/greeting — a short, personalized opener written from the
// shop's real data, shown when the Copiloto opens. Pro+ feature.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const isGestor = session.role === "OWNER" || session.role === "MANAGER";
  const isBarber = session.role === "BARBER";
  if ((!isGestor && !isBarber) || !session.barbershopId) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  if (!planHasAI(shop?.plan)) return NextResponse.json({ greeting: "", locked: true });

  const role: CopilotRole = isBarber ? "BARBER" : "GESTOR";
  let staffId: string | null = null;
  if (isBarber) {
    const staff = await prisma.staff.findUnique({ where: { userId: session.sub }, select: { id: true } });
    staffId = staff?.id ?? null;
  }

  const result = await copilotGreeting(role, session.barbershopId, staffId);
  return NextResponse.json(result);
}
