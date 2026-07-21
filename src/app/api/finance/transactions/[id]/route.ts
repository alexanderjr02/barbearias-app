import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// DELETE /api/finance/transactions/{id} — remove um lançamento financeiro.
// Faltava: sem isto, um lançamento errado (ou lixo, como o -9999 injetado num
// teste) ficava preso na tela para sempre. Só gestor/gerente, e só da própria
// barbearia — ninguém apaga o financeiro de outra loja.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const tx = await prisma.financialTransaction.findUnique({ where: { id }, select: { barbershopId: true } });
  if (!tx || tx.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  }

  await prisma.financialTransaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
