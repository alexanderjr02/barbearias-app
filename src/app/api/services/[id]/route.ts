import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

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

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
      ...(typeof body.name === "string" && { name: body.name }),
      ...(typeof body.description === "string" && { description: body.description }),
      ...(typeof body.category === "string" && { category: body.category }),
      ...(typeof body.price === "number" && { price: body.price }),
      ...(typeof body.duration === "number" && { duration: body.duration }),
      ...((typeof body.image === "string" || body.image === null) && { image: body.image }),
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
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  try {
    await prisma.service.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Não é possível excluir um serviço com agendamentos vinculados. Desative-o em vez disso." },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: true });
}
