import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff || staff.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  }

  // Grant a login to an existing profile-only staff member (never changes an
  // existing login's email/password — use a dedicated flow for that later).
  let userId: string | undefined;
  if (!staff.userId && body.email && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        name: body.name ?? staff.name,
        email: body.email,
        password: await bcrypt.hash(body.password, 10),
        role: "BARBER",
      },
    });
    userId = user.id;
  }

  const updated = await prisma.staff.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && { name: body.name }),
      ...(typeof body.role === "string" && { role: body.role }),
      ...((typeof body.specialties === "string" || body.specialties === null) && { specialties: body.specialties }),
      ...((typeof body.avatar === "string" || body.avatar === null) && { avatar: body.avatar }),
      ...(typeof body.commissionRate === "number" && { commissionRate: body.commissionRate }),
      ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
      ...(userId && { userId }),
    },
  });

  return NextResponse.json({ ...updated, hasLogin: !!updated.userId });
}
