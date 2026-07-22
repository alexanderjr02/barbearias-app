import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { signAccessToken } from "@/lib/auth";
import { setAccessCookie } from "@/lib/sessionCookies";
import { isSecureRequest, getClientIp } from "@/lib/requestIp";
import { logAdminAction } from "@/lib/audit";

// POST /api/admin/impersonate — abre o painel de uma barbearia com os olhos
// do dono dela.
//
// Serve para o suporte parar de trabalhar por adivinhação: em vez de pedir
// print e tentar reproduzir, o admin vê a tela exata que o gestor está vendo.
//
// As três regras que separam isto de uma porta dos fundos:
//
//  1. NÃO troca o cookie de renovação. Ele continua sendo o do admin, então a
//     impersonação morre sozinha em 15 minutos — e o "voltar" é só reemitir.
//     Sessão de impersonação que dura para sempre é conta compartilhada.
//  2. A sessão carrega `imp` com o id do admin. A faixa no topo da tela lê
//     dali: quem está dentro vê o tempo todo que não é o dono de verdade.
//  3. Fica na auditoria com IP, antes de qualquer coisa acontecer. As
//     referências de mercado são unânimes: impersonação sem registro é o
//     maior buraco de conformidade de um painel administrativo.
//
// Só SUPER_ADMIN. Suporte (SUPPORT_ADMIN) não entra na conta de ninguém.
export async function POST(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { barbershopId?: string } | null;
  const barbershopId = typeof body?.barbershopId === "string" ? body.barbershopId : "";
  if (!barbershopId) return NextResponse.json({ error: "Informe a barbearia" }, { status: 400 });

  const shop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
    select: { id: true, name: true, isActive: true, owner: { select: { id: true, name: true, email: true, isActive: true } } },
  });
  if (!shop) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  if (!shop.owner) return NextResponse.json({ error: "Essa barbearia não tem dono cadastrado" }, { status: 409 });
  if (!shop.owner.isActive) return NextResponse.json({ error: "O dono dessa barbearia está desativado" }, { status: 409 });

  await logAdminAction({
    actorId: session.sub,
    action: "admin.impersonate.start",
    targetType: "Barbershop",
    targetId: shop.id,
    metadata: { ip: getClientIp(request) ?? "desconhecido", shop: shop.name, owner: shop.owner.email },
  });

  const token = await signAccessToken({
    sub: shop.owner.id,
    role: "OWNER",
    name: shop.owner.name,
    email: shop.owner.email,
    barbershopId: shop.id,
    imp: session.sub,
  });

  const response = NextResponse.json({ ok: true, shop: shop.name, owner: shop.owner.name, redirectTo: "/dashboard" });
  setAccessCookie(response, token, isSecureRequest(request));
  return response;
}
