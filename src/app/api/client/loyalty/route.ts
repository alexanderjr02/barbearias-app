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

  const [accounts, links] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where: { userId: session.sub },
      include: { barbershop: { select: { name: true, slug: true } } },
      orderBy: { points: "desc" },
    }),
    // Barbearias onde o cliente já é cliente mas ainda não tem conta de pontos.
    // Sem isto, quem só usa cartão de selos (pontos desligados pelo gestor)
    // nunca teria por onde abrir a carteira de fidelidade.
    prisma.barbershopClient.findMany({
      where: { userId: session.sub, status: { not: "BLOCKED" } },
      include: { barbershop: { select: { name: true, slug: true } } },
    }),
  ]);

  type AccountRow = (typeof accounts)[number];
  type LinkRow = (typeof links)[number];

  const rows = accounts.map((a: AccountRow) => ({
    barbershopId: a.barbershopId,
    barbershopName: a.barbershop.name,
    barbershopSlug: a.barbershop.slug,
    points: a.points,
    tier: a.tier,
  }));

  const seen = new Set(rows.map((r: { barbershopId: string }) => r.barbershopId));
  for (const l of links as LinkRow[]) {
    if (seen.has(l.barbershopId)) continue;
    rows.push({
      barbershopId: l.barbershopId,
      barbershopName: l.barbershop.name,
      barbershopSlug: l.barbershop.slug,
      points: 0,
      tier: "BRONZE",
    });
  }

  return NextResponse.json(rows);
}
