import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { getSession } from "@/lib/auth";

const FORBIDDEN = { error: "Assinaturas de clientes é um recurso exclusivo do plano White Label." };
const VALID_STATUS = ["ACTIVE", "PAST_DUE", "CANCELLED"];

// Two callers can PATCH a subscriber: the gestor (any status change, gated
// to White Label) or the client themself cancelling their own membership
// (only CANCELLED, no plan gate — cancelling is always allowed).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const sub = await prisma.clientSubscription.findUnique({ where: { id }, include: { plan: true } });
  if (!sub) {
    return NextResponse.json({ error: "Assinante não encontrado" }, { status: 404 });
  }

  const gestorSession = await requireBarbershopSession();
  if (gestorSession) {
    if (sub.plan.barbershopId !== gestorSession.barbershopId) {
      return NextResponse.json({ error: "Assinante não encontrado" }, { status: 404 });
    }
    const shop = await prisma.barbershop.findUnique({ where: { id: gestorSession.barbershopId }, select: { plan: true } });
    if (shop?.plan !== "ENTERPRISE") {
      return NextResponse.json(FORBIDDEN, { status: 403 });
    }
  } else {
    const clientSession = await getSession();
    const isOwnCancellation = clientSession && sub.clientId === clientSession.sub && body.status === "CANCELLED";
    if (!isOwnCancellation) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
  }

  const updated = await prisma.clientSubscription.update({
    where: { id },
    data: {
      status: body.status,
      cancelledAt: body.status === "CANCELLED" ? new Date() : null,
      // "Marcar como pago" simulates a manual retry succeeding — pushes the
      // next charge a full cycle forward from today instead of leaving it
      // stuck in the past.
      ...(body.status === "ACTIVE" && sub.status === "PAST_DUE"
        ? { nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        : {}),
    },
  });

  return NextResponse.json(updated);
}
