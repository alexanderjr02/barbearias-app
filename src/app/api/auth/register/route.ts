import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signAccessToken } from "@/lib/auth";
import { generateRefreshToken } from "@/lib/refreshToken";
import { setSessionCookies } from "@/lib/sessionCookies";
import { getClientIp, isSecureRequest } from "@/lib/requestIp";
import { registerOwnerSchema, firstFieldError } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

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

  // Freio DEPOIS da validação, de propósito: quem errou o formulário e está
  // corrigindo não pode gastar o orçamento, e recusar payload inválido é
  // barato (nem hash de senha nem escrita no banco). O que precisa de teto é
  // a criação de conta de verdade.
  //
  // 10 por hora, e não 2 ou 3, porque um IP não é uma pessoa: escritório
  // compartilhado, coworking e operadora de celular com NAT põem muita gente
  // atrás do mesmo endereço. Apertar demais bloqueia cliente legítimo, que é
  // um estrago pior do que o que se está evitando.
  //
  // Configurável porque a suíte de integração cria dezenas de barbearias
  // contra o mesmo localhost: ela sobe o teto em vez de desligar o freio,
  // assim o caminho do código continua sendo exercitado de verdade.
  // (Não dá pra detectar teste por NODE_ENV: `next dev` o força para
  // "development" mesmo quando quem o subiu pediu "test".)
  const ip = getClientIp(request) ?? "desconhecido";
  const maxPerHour = Number(process.env.REGISTER_RATE_LIMIT) || 10;
  const limit = rateLimit(`register:${ip}`, maxPerHour, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de cadastro deste local. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const { name, email, password, phone, barbershopName, barbershopSlug, city, state, address, zipCode, whatsapp, instagram, cnpj, plan } = parsed.data;

  try {
    const [existingUser, existingShop, existingCnpj] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.barbershop.findUnique({ where: { slug: barbershopSlug } }),
      // Um CNPJ, uma barbearia. Sem isto o mesmo documento abre quantas
      // barbearias quiser — que é exatamente como se monta uma fileira de
      // fantasmas com aparência de legítima.
      prisma.barbershop.findFirst({ where: { cnpj }, select: { id: true } }),
    ]);
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    if (existingShop) {
      return NextResponse.json({ error: "Esse link personalizado já está em uso" }, { status: 409 });
    }
    if (existingCnpj) {
      return NextResponse.json({ error: "Já existe uma barbearia cadastrada com esse CNPJ" }, { status: 409 });
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
