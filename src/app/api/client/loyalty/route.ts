import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/client/loyalty — the logged-in client's loyalty balance across
// every barbershop where they've earned points.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const accounts = await prisma.loyaltyAccount.findMany({
    where: { userId: session.sub },
    include: { barbershop: { select: { name: true, slug: true } } },
    orderBy: { points: "desc" },
  });

  return NextResponse.json(
    accounts.map((a) => ({
      barbershopName: a.barbershop.name,
      barbershopSlug: a.barbershop.slug,
      points: a.points,
      tier: a.tier,
    }))
  );
}
