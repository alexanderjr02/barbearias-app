import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

interface RankingEntry {
  key: string;
  clientId: string | null;
  name: string;
  avatar: string | null;
  visits: number;
  totalSpent: number;
  lastVisit: string;
}

// GET /api/barber/clients/ranking — the logged-in barber's own clients,
// ranked by loyalty (completed visit count, tie-broken by amount spent).
// Powers the "clientes fiéis" ranking shown on the barber's app home.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "BARBER") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const staff = await prisma.staff.findUnique({ where: { userId: session.sub } });
  if (!staff) {
    return NextResponse.json({ error: "Nenhum perfil de barbeiro vinculado a este usuário" }, { status: 404 });
  }

  const appointments = await prisma.appointment.findMany({
    where: { staffId: staff.id, status: "COMPLETED" },
    include: { client: { select: { avatar: true } } },
    orderBy: { date: "desc" },
  });

  const map = new Map<string, RankingEntry>();
  for (const a of appointments) {
    const key = a.clientId ?? a.clientEmail ?? a.clientPhone;
    const existing = map.get(key);
    if (existing) {
      existing.visits += 1;
      existing.totalSpent += a.totalPrice;
    } else {
      map.set(key, {
        key,
        clientId: a.clientId,
        name: a.clientName,
        avatar: a.client?.avatar ?? null,
        visits: 1,
        totalSpent: a.totalPrice,
        lastVisit: a.date.toISOString(),
      });
    }
  }

  const ranking = Array.from(map.values()).sort((a, b) => b.visits - a.visits || b.totalSpent - a.totalSpent);

  return NextResponse.json(ranking.slice(0, 30));
}
