import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// Editar e excluir um produto do estoque. Antes só existia criar e vender, então
// um produto cadastrado errado (nome trocado, preço errado) ficava na lista pra
// sempre, e a única saída era conviver com ele.

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && body.name.trim() !== "" && { name: body.name.trim() }),
      ...((typeof body.image === "string" || body.image === null) && { image: body.image }),
      ...((typeof body.brand === "string" || body.brand === null) && { brand: body.brand }),
      ...((typeof body.sku === "string" || body.sku === null) && { sku: body.sku }),
      ...((typeof body.category === "string" || body.category === null) && { category: body.category }),
      ...(typeof body.price === "number" && body.price >= 0 && { price: body.price }),
      ...((typeof body.costPrice === "number" || body.costPrice === null) && { costPrice: body.costPrice }),
      ...(typeof body.quantity === "number" && body.quantity >= 0 && { quantity: Math.floor(body.quantity) }),
      ...(typeof body.minQuantity === "number" && body.minQuantity >= 0 && { minQuantity: Math.floor(body.minQuantity) }),
      ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  // Nenhuma outra tabela aponta para Product (a venda registra o nome como
  // texto no lançamento financeiro), então a exclusão não deixa histórico
  // órfão nem apaga o faturamento já registrado.
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível excluir este produto agora. Tente novamente." },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: true });
}
