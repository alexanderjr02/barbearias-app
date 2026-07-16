import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/barber/last-recipe?clientId= — the most recent cut "recipe" (ficha
// técnica) recorded for this client at this barbershop, so the barber can
// replicate the exact same cut. Returns null when there's none yet.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.role === "CLIENT") return NextResponse.json(null);
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId || !session.barbershopId) return NextResponse.json(null);

  const last = await prisma.appointment.findFirst({
    where: {
      clientId,
      barbershopId: session.barbershopId,
      OR: [
        { recipeMachine: { not: null } },
        { recipeFinish: { not: null } },
        { recipeProducts: { not: null } },
        { recipeNotes: { not: null } },
      ],
    },
    orderBy: { date: "desc" },
    select: { recipeMachine: true, recipeFinish: true, recipeProducts: true, recipeNotes: true, date: true },
  });
  return NextResponse.json(last);
}
