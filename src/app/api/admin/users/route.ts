import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

// GET /api/admin/users?search=&role=&status=&page=&pageSize=
export async function GET(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));

  const where = {
    ...(role && role !== "ALL" ? { role } : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        barbershop: { select: { name: true } },
        staffProfile: { select: { barbershop: { select: { name: true } } } },
      },
    }),
  ]);

  type UserRow = (typeof users)[number];
  const shaped = users.map((u: UserRow) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    barbershopName: u.barbershop?.name ?? u.staffProfile?.barbershop?.name ?? null,
  }));

  return NextResponse.json({ users: shaped, total, page, pageSize });
}

// POST /api/admin/users — creates another SUPER_ADMIN (bus-factor: Alexander
// shouldn't be the only person who can ever get into /admin).
export async function POST(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um usuário com esse e-mail" }, { status: 409 });
  }

  const role = body.role === "SUPPORT_ADMIN" ? "SUPPORT_ADMIN" : "SUPER_ADMIN";

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: await bcrypt.hash(body.password, 10),
      role,
    },
  });

  await logAdminAction({ actorId: session.sub, action: "user.created", targetType: "User", targetId: user.id, metadata: { role } });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
}
