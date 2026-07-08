import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// GET /api/loyalty — gestor view of every client's loyalty balance at this
// barbershop, sorted by points descending.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [barbershop, accounts] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { pointsPerReal: true } }),
    prisma.loyaltyAccount.findMany({
      where: { barbershopId: session.barbershopId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { points: "desc" },
    }),
  ]);

  return NextResponse.json({
    pointsPerReal: barbershop?.pointsPerReal ?? 10,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.user.name,
      email: a.user.email,
      points: a.points,
      tier: a.tier,
    })),
  });
}
