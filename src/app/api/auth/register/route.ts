import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signAccessToken } from "@/lib/auth";
import { generateRefreshToken } from "@/lib/refreshToken";
import { setSessionCookies } from "@/lib/sessionCookies";
import { isSecureRequest } from "@/lib/requestIp";
import { registerOwnerSchema, firstFieldError } from "@/lib/validation";

const PLAN_BY_FORM_VALUE: Record<string, string> = {
  starter: "FREE",
  pro: "PRO",
  "white-label": "ENTERPRISE",
};

// POST /api/auth/register — creates an OWNER account *and* their barbershop
// in one step (mandatory: an ownerless account has nothing to manage). For
// a client signing up for themselves, see /api/auth/register/client instead.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = registerOwnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstFieldError(parsed.error) }, { status: 400 });
  }
  const { name, email, password, phone, barbershopName, barbershopSlug, city, state, address, zipCode, whatsapp, instagram, cnpj, plan } = parsed.data;

  try {
    const [existingUser, existingShop] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.barbershop.findUnique({ where: { slug: barbershopSlug } }),
    ]);
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    if (existingShop) {
      return NextResponse.json({ error: "Esse link personalizado já está em uso" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Transaction: a User with no Barbershop (or vice versa) is a broken
    // account — either both rows land, or neither does.
    const { user, barbershop } = await prisma.$transaction(async (tx: typeof prisma) => {
      const user = await tx.user.create({
        data: { name, email, password: hashedPassword, phone, role: "OWNER" },
      });
      const barbershop = await tx.barbershop.create({
        data: {
          name: barbershopName,
          slug: barbershopSlug,
          city,
          state: state || null,
          address: address || null,
          zipCode: zipCode || null,
          whatsapp: whatsapp || null,
          instagram: instagram || null,
          cnpj,
          ownerId: user.id,
          plan: PLAN_BY_FORM_VALUE[plan ?? ""] ?? "FREE",
        },
      });
      return { user, barbershop };
    });

    const session = { sub: user.id, role: "OWNER" as const, name: user.name, email: user.email, barbershopId: barbershop.id };
    const accessToken = await signAccessToken(session);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const response = NextResponse.json(
      { success: true, user: { id: user.id, name: user.name, email: user.email, role: "OWNER", barbershopId: barbershop.id }, accessToken, refreshToken },
      { status: 201 }
    );
    setSessionCookies(response, accessToken, refreshToken, isSecureRequest(request));
    return response;
  } catch {
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
  }
}
