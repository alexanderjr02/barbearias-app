import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { materializeRecurringExpenses } from "@/lib/finance/autoEntry";

// GET /api/finance/recurring — despesas fixas cadastradas.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const items = await prisma.recurringExpense.findMany({
    where: { barbershopId: session.barbershopId },
    orderBy: [{ isActive: "desc" }, { dayOfMonth: "asc" }],
  });

  type Row = (typeof items)[number];
  const monthlyTotal = (items as Row[])
    .filter((i: Row) => i.isActive)
    .reduce((acc: number, i: Row) => acc + i.amount, 0);

  return NextResponse.json({ items, monthlyTotal });
}

// POST /api/finance/recurring { description, category, amount, dayOfMonth }
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const category = typeof body?.category === "string" && body.category.trim() ? body.category.trim() : "Fixas";
  const amount = Number(body?.amount);
  const dayOfMonth = Number(body?.dayOfMonth ?? 1);

  if (!description) return NextResponse.json({ error: "Descreva a despesa" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  // 28 é o teto de propósito: 29/30/31 não existem em todo mês, e aceitar
  // "vence dia 31" criaria uma despesa que pula fevereiro sem explicação.
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
    return NextResponse.json({ error: "O dia deve ser entre 1 e 28" }, { status: 400 });
  }

  const created = await prisma.recurringExpense.create({
    data: { barbershopId: session.barbershopId, description, category, amount, dayOfMonth },
  });

  // Se o dia já passou neste mês, o lançamento entra na hora — senão o gestor
  // cadastra o aluguel dia 20 e não vê nada até o mês que vem.
  await materializeRecurringExpenses(session.barbershopId).catch(() => {});

  return NextResponse.json(created, { status: 201 });
}

// PATCH /api/finance/recurring { id, isActive?, amount? }
export async function PATCH(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Despesa não informada" }, { status: 400 });

  const existing = await prisma.recurringExpense.findUnique({ where: { id }, select: { barbershopId: true } });
  if (!existing || existing.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (Number.isFinite(Number(body.amount)) && Number(body.amount) > 0) data.amount = Number(body.amount);

  const updated = await prisma.recurringExpense.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/finance/recurring?id=...
// Só apaga a regra — os lançamentos já gerados ficam, porque apagá-los
// reescreveria meses fechados e o histórico deixaria de bater.
export async function DELETE(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Despesa não informada" }, { status: 400 });

  const existing = await prisma.recurringExpense.findUnique({ where: { id }, select: { barbershopId: true } });
  if (!existing || existing.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
  }

  await prisma.recurringExpense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
