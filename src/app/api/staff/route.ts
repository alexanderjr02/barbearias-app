import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { staffCreateSchema, firstFieldError } from "@/lib/validation";
import { staffLimitError } from "@/lib/planLimits";

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

  type StaffRow = (typeof staff)[number];
  const result = staff.map((member: StaffRow) => {
    const revenue = member.appointments.reduce((acc: number, a: StaffRow["appointments"][number]) => acc + a.totalPrice, 0);
    const avgRating =
      member.reviews.length > 0
        ? member.reviews.reduce((acc: number, r: StaffRow["reviews"][number]) => acc + r.rating, 0) / member.reviews.length
        : null;
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
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }
  const parsed = staffCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstFieldError(parsed.error) }, { status: 400 });
  }
  const { name, role, specialties, avatar, commissionRate, email, password } = parsed.data;

  // Plan limit — block adding a barber beyond what the plan allows.
  const limitError = await staffLimitError(session.barbershopId);
  if (limitError) {
    return NextResponse.json({ error: limitError, upgradeRequired: true }, { status: 403 });
  }

  // Optionally create a login for this barber (Role.BARBER) so they can use
  // the mobile app. Without email/password, the Staff row is profile-only.
  let userId: string | undefined;
  if (email && password) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: "BARBER",
      },
    });
    userId = user.id;
  }

  const member = await prisma.staff.create({
    data: {
      name,
      role: role || "BARBER",
      specialties,
      avatar,
      commissionRate: commissionRate ?? 0.4,
      barbershopId: session.barbershopId,
      userId,
    },
  });

  return NextResponse.json(member, { status: 201 });
}
