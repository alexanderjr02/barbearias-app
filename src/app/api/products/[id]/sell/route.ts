import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { recordAutoIncome } from "@/lib/finance/autoEntry";

// POST /api/products/[id]/sell { quantity, paymentMethod }
//
// Venda de balcão: baixa o estoque e lança a receita no financeiro numa só
// ação. Antes o gestor tinha que fazer as duas coisas à mão, em telas
// diferentes — e na prática fazia só a primeira, então o estoque batia e o
// financeiro não.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const quantity = Number(body?.quantity ?? 1);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  // Vender mais do que existe deixaria o estoque negativo, que é pior do que
  // recusar: some a informação de que faltou produto.
  if (product.quantity < quantity) {
    return NextResponse.json(
      { error: `Estoque insuficiente — restam ${product.quantity} ${product.quantity === 1 ? "unidade" : "unidades"}` },
      { status: 400 }
    );
  }

  const total = product.price * quantity;
  const soldAt = new Date();

  const updated = await prisma.product.update({
    where: { id },
    data: { quantity: { decrement: quantity } },
  });

  // A baixa de estoque é o que não pode se perder (é ela que o gestor confere
  // olhando a prateleira). Se o lançamento financeiro falhar, a venda continua
  // registrada e ele lança à mão — o contrário deixaria estoque e caixa
  // divergentes sem ninguém perceber.
  let recorded = true;
  try {
    await recordAutoIncome({
      barbershopId: session.barbershopId,
      amount: total,
      category: "Produtos",
      description: `${product.name}${quantity > 1 ? ` (${quantity}x)` : ""}`,
      paymentMethod: typeof body?.paymentMethod === "string" ? body.paymentMethod : null,
      reference: `product-sale:${product.id}:${soldAt.getTime()}`,
      date: soldAt,
    });
  } catch {
    recorded = false;
  }

  return NextResponse.json({
    ok: true,
    productId: product.id,
    quantitySold: quantity,
    remaining: updated.quantity,
    total,
    recordedInFinance: recorded,
  });
}
