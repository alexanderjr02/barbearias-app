import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const staff = await prisma.staff.findMany({
    where: { barbershopId: session.barbershopId },
    include: {
      appointments: {
        where: { status: "COMPLETED" },
        select: { totalPrice: true },
      },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = staff.map((member) => {
    const revenue = member.appointments.reduce((acc, a) => acc + a.totalPrice, 0);
    const avgRating =
      member.reviews.length > 0 ? member.reviews.reduce((acc, r) => acc + r.rating, 0) / member.reviews.length : null;
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      specialties: member.specialties,
      avatar: member.avatar,
      commissionRate: member.commissionRate,
      isActive: member.isActive,
      appointmentsCount: member.appointments.length,
      revenue,
      hasLogin: !!member.userId,
      avgRating,
      reviewCount: member.reviews.length,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  // Optionally create a login for this barber (Role.BARBER) so they can use
  // the mobile app. Without email/password, the Staff row is profile-only.
  let userId: string | undefined;
  if (body.email && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: await bcrypt.hash(body.password, 10),
        role: "BARBER",
      },
    });
    userId = user.id;
  }

  const member = await prisma.staff.create({
    data: {
      name: body.name,
      role: body.role || "BARBER",
      specialties: body.specialties,
      avatar: typeof body.avatar === "string" ? body.avatar : undefined,
      commissionRate: body.commissionRate ?? 0.4,
      barbershopId: session.barbershopId,
      userId,
    },
  });

  return NextResponse.json(member, { status: 201 });
}
