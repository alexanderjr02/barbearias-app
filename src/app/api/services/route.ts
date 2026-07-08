import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { barbershopId: session.barbershopId },
    include: { _count: { select: { appointments: true } } },
    orderBy: { createdAt: "asc" },
  });

  const result = services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    image: service.image,
    category: service.category,
    duration: service.duration,
    price: service.price,
    isActive: service.isActive,
    appointmentsCount: service._count.appointments,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.duration !== "number" || typeof body.price !== "number") {
    return NextResponse.json({ error: "Nome, duração e preço são obrigatórios" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      name: body.name,
      description: body.description,
      image: typeof body.image === "string" ? body.image : undefined,
      duration: body.duration,
      price: body.price,
      category: body.category || "HAIRCUT",
      barbershopId: session.barbershopId,
    },
  });

  return NextResponse.json(service, { status: 201 });
}
