import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [staff, user] = await Promise.all([
    session.role === "BARBER" ? prisma.staff.findUnique({ where: { userId: session.sub } }) : null,
    prisma.user.findUnique({ where: { id: session.sub }, select: { phone: true, avatar: true, dateOfBirth: true } }),
  ]);

  return NextResponse.json({
    id: session.sub,
    name: session.name,
    email: session.email,
    role: session.role,
    barbershopId: session.barbershopId,
    staffId: staff?.id ?? null,
    phone: user?.phone ?? null,
    avatar: user?.avatar ?? null,
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
  });
}

// PATCH /api/auth/me — self-service profile edit (name, phone, avatar).
// Also mirrors the name onto the linked Staff row so the gestor's Equipe
// page stays in sync with what the barber sets for themselves.
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const data: Record<string, string | null | Date> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.phone === "string" || body.phone === null) data.phone = body.phone;
  if (typeof body.avatar === "string" || body.avatar === null) data.avatar = body.avatar;
  // Nascimento habilita a campanha de aniversário — por isso o cliente pode
  // preencher sozinho, sem depender do gestor cadastrar por ele.
  if (typeof body.dateOfBirth === "string" && body.dateOfBirth.trim()) {
    const d = new Date(body.dateOfBirth);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Data de nascimento inválida" }, { status: 400 });
    }
    data.dateOfBirth = d;
  } else if (body.dateOfBirth === null) {
    data.dateOfBirth = null;
  }

  const user = await prisma.user.update({ where: { id: session.sub }, data });

  if (data.name || data.avatar !== undefined) {
    await prisma.staff.updateMany({
      where: { userId: session.sub },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
    });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
  });
}
