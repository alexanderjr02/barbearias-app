import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/nps — whether this gestor should be prompted (hasn't answered in
// the last 30 days). Kept deliberately simple: no scheduling infra, just a
// "have I asked recently" check done at request time.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const recent = await prisma.npsResponse.findFirst({
    where: { userId: session.sub, createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
  });

  return NextResponse.json({ shouldPrompt: !recent });
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const score = Number(body?.score);
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: "Nota deve ser de 0 a 10" }, { status: 400 });
  }

  const response = await prisma.npsResponse.create({
    data: { barbershopId: session.barbershopId, userId: session.sub, score, comment: typeof body?.comment === "string" ? body.comment : null },
  });

  return NextResponse.json(response, { status: 201 });
}
