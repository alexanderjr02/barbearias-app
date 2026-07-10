import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signAccessToken } from "@/lib/auth";
import { generateRefreshToken } from "@/lib/refreshToken";
import { setSessionCookies } from "@/lib/sessionCookies";
import { registerClientSchema, firstFieldError } from "@/lib/validation";

// POST /api/auth/register/client — a client creating their own account
// (web and mobile app "Criar conta"). Not tied to a barbershop yet — that
// link (BarbershopClient) is created the first time they book or a gestor
// adds them. Distinct from /api/auth/register, which always creates an
// OWNER + their Barbershop together.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = registerClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstFieldError(parsed.error) }, { status: 400 });
  }
  const { name, email, password, phone, dateOfBirth } = parsed.data;

  try {
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
        dateOfBirth: new Date(dateOfBirth),
        role: "CLIENT",
      },
    });

    const session = { sub: user.id, role: "CLIENT" as const, name: user.name, email: user.email, barbershopId: null };
    const accessToken = await signAccessToken(session);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const response = NextResponse.json(
      { success: true, user: { id: user.id, name: user.name, email: user.email, role: "CLIENT", barbershopId: null }, accessToken, refreshToken },
      { status: 201 }
    );
    setSessionCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    console.error("[auth/register/client]", error);
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
  }
}
