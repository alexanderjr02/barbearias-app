import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signAccessToken } from "@/lib/auth";
import { generateRefreshToken } from "@/lib/refreshToken";
import { setSessionCookies } from "@/lib/sessionCookies";

const PLAN_BY_FORM_VALUE: Record<string, string> = {
  starter: "FREE",
  pro: "PRO",
  "white-label": "ENTERPRISE",
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  try {
    const { name, email, password, phone, barbershopName, barbershopSlug, city, plan } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: "OWNER",
      },
    });

    let barbershopId: string | null = null;
    if (barbershopName && barbershopSlug) {
      const existingShop = await prisma.barbershop.findUnique({ where: { slug: barbershopSlug } });
      if (existingShop) {
        return NextResponse.json({ error: "Esse link personalizado já está em uso" }, { status: 409 });
      }
      const barbershop = await prisma.barbershop.create({
        data: {
          name: barbershopName,
          slug: barbershopSlug,
          city,
          ownerId: user.id,
          plan: PLAN_BY_FORM_VALUE[plan] ?? "FREE",
        },
      });
      barbershopId = barbershop.id;
    }

    const session = { sub: user.id, role: "OWNER" as const, name: user.name, email: user.email, barbershopId };
    const accessToken = await signAccessToken(session);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const response = NextResponse.json(
      { success: true, user: { id: user.id, name: user.name, email: user.email, role: "OWNER", barbershopId }, accessToken, refreshToken },
      { status: 201 }
    );
    setSessionCookies(response, accessToken, refreshToken);
    return response;
  } catch {
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
  }
}
