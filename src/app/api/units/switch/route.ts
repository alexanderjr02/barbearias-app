import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, signAccessToken, ACCESS_COOKIE, ACCESS_TOKEN_TTL } from "@/lib/auth";
import { isSecureRequest } from "@/lib/requestIp";

// POST /api/units/switch { barbershopId } — troca a unidade que o painel está
// vendo. Duas coisas acontecem juntas, e ambas são necessárias:
//   1. grava a escolha em User.activeBarbershopId, para o /auth/refresh não
//      devolver o dono à unidade primária a cada 15 minutos;
//   2. reemite o access token com o novo barbershopId, para as 72 rotas que
//      filtram por sessão passarem a ver a unidade nova imediatamente.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const barbershopId = String(body?.barbershopId ?? "");
  if (!barbershopId) return NextResponse.json({ error: "Informe a unidade." }, { status: 400 });

  // Só troca para uma unidade que é realmente dele — senão a sessão viraria
  // uma porta para os dados de outra rede.
  const unit = await prisma.barbershop.findFirst({
    where: { id: barbershopId, ownerId: session.sub },
    select: { id: true, name: true, isActive: true },
  });
  if (!unit) return NextResponse.json({ error: "Unidade não encontrada." }, { status: 404 });
  if (!unit.isActive) return NextResponse.json({ error: "Esta unidade está suspensa." }, { status: 403 });

  await prisma.user.update({ where: { id: session.sub }, data: { activeBarbershopId: unit.id } });

  const accessToken = await signAccessToken({ ...session, barbershopId: unit.id });
  // O token vai no corpo TAMBÉM porque o app mobile autentica por
  // `Authorization: Bearer` e não enxerga o cookie — sem isto a troca de
  // unidade funcionaria no web e falharia silenciosamente no celular.
  const response = NextResponse.json({ unit: { id: unit.id, name: unit.name }, accessToken });
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: ACCESS_TOKEN_TTL,
  });
  return response;
}
