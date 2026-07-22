import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const responses = await prisma.npsResponse.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { barbershop: { select: { name: true } }, user: { select: { name: true } } },
  });

  const scores = responses.map((r: (typeof responses)[number]) => r.score);
  const average = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null;
  const promoters = scores.filter((s: number) => s >= 9).length;
  const detractors = scores.filter((s: number) => s <= 6).length;
  const npsScore = scores.length ? Math.round(((promoters - detractors) / scores.length) * 100) : null;

  return NextResponse.json({
    average,
    npsScore,
    responseCount: scores.length,
    responses: responses.map((r: (typeof responses)[number]) => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      barbershopName: r.barbershop.name,
      userName: r.user.name,
      createdAt: r.createdAt,
    })),
  });
}
