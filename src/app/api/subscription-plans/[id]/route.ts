import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

const FORBIDDEN = { error: "Assinaturas de clientes é um recurso exclusivo do plano White Label." };

async function loadOwnedPlan(id: string, barbershopId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan || plan.barbershopId !== barbershopId) return null;
  return plan;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  if (shop?.plan !== "ENTERPRISE") {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const plan = await loadOwnedPlan(id, session.barbershopId);
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  }

  const updated = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
      ...(typeof body.name === "string" && { name: body.name }),
      ...(typeof body.description === "string" && { description: body.description }),
      ...(typeof body.price === "number" && body.price > 0 && { price: body.price }),
      ...(["MONTHLY", "QUARTERLY", "ANNUAL"].includes(body.billingCycle) && { billingCycle: body.billingCycle }),
      ...(typeof body.benefits === "string" && { benefits: body.benefits }),
      ...(typeof body.color === "string" && { color: body.color }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const shop = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });
  if (shop?.plan !== "ENTERPRISE") {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const { id } = await params;
  const plan = await loadOwnedPlan(id, session.barbershopId);
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  }

  const activeSubscribers = await prisma.clientSubscription.count({
    where: { planId: id, status: { in: ["ACTIVE", "PAST_DUE"] } },
  });
  if (activeSubscribers > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir um plano com assinantes ativos. Desative-o em vez disso." },
      { status: 409 }
    );
  }

  await prisma.subscriptionPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
