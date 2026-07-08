import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { barbershopId: session.barbershopId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.price !== "number") {
    return NextResponse.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name: body.name,
      description: body.description,
      image: typeof body.image === "string" ? body.image : undefined,
      sku: body.sku,
      price: body.price,
      costPrice: body.costPrice,
      quantity: body.quantity ?? 0,
      minQuantity: body.minQuantity ?? 5,
      category: body.category,
      brand: body.brand,
      barbershopId: session.barbershopId,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
