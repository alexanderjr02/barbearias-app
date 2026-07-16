import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  staffId: string;
  staff: { name: string } | null;
  client: { name: string } | null;
  appointment: { service: { name: string } | null } | null;
}

// GET /api/reviews — the barbershop's client reviews (post-service ratings),
// with overall and per-barber averages, for the gestor's "Avaliações" screen.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const reviews: ReviewRow[] = await prisma.review.findMany({
    where: { staff: { barbershopId: session.barbershopId } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      staffId: true,
      staff: { select: { name: true } },
      client: { select: { name: true } },
      appointment: { select: { service: { select: { name: true } } } },
    },
  });

  const count = reviews.length;
  const average = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  const byBarberMap = new Map<string, { staffId: string; name: string; sum: number; count: number }>();
  for (const r of reviews) {
    const entry = byBarberMap.get(r.staffId) ?? { staffId: r.staffId, name: r.staff?.name ?? "Barbeiro", sum: 0, count: 0 };
    entry.sum += r.rating;
    entry.count += 1;
    byBarberMap.set(r.staffId, entry);
  }
  const byBarber = Array.from(byBarberMap.values())
    .map((b) => ({ staffId: b.staffId, name: b.name, average: b.sum / b.count, count: b.count }))
    .sort((a, b) => b.average - a.average);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;

  return NextResponse.json({
    summary: { average, count, byBarber, distribution },
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      clientName: r.client?.name ?? "Cliente",
      staffName: r.staff?.name ?? "Barbeiro",
      serviceName: r.appointment?.service?.name ?? null,
    })),
  });
}
