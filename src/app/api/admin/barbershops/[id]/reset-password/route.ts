import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { getClientIp } from "@/lib/requestIp";

// POST /api/admin/barbershops/[id]/reset-password — o admin define uma senha
// nova para o dono da barbearia e a devolve para repassar.
//
// Existe pelo caso que aconteceu com o próprio dono desta plataforma: o
// gestor perde a senha, o e-mail de recuperação não chega, e não havia botão
// nenhum — o suporte ficava sem resposta. Um painel administrativo que não
// consegue destravar o acesso de um cliente não está administrando nada.
//
// Não é "ver a senha": ninguém consegue ler a antiga, ela é hash. É definir
// uma nova, o que fica registrado na auditoria com IP — e derruba as sessões
// abertas, porque se a senha estava perdida, quem eventualmente estivesse
// dentro não deveria continuar.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();
  const { id } = await params;

  const shop = await prisma.barbershop.findUnique({
    where: { id },
    select: { name: true, owner: { select: { id: true, name: true, email: true } } },
  });
  if (!shop?.owner) return NextResponse.json({ error: "Barbearia ou dono não encontrado" }, { status: 404 });

  // Legível ao telefone: o admin vai ditar isto.
  const senhaNova = `cortix${randomBytes(3).toString("hex")}A1`;

  await prisma.user.update({
    where: { id: shop.owner.id },
    data: { password: await bcrypt.hash(senhaNova, 10) },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: shop.owner.id } });

  await logAdminAction({
    actorId: session.sub,
    action: "barbershop.owner_password_reset",
    targetType: "User",
    targetId: shop.owner.id,
    metadata: { ip: getClientIp(request) ?? "desconhecido", barbearia: shop.name, email: shop.owner.email },
  });

  return NextResponse.json({
    ok: true,
    email: shop.owner.email,
    senhaNova,
    aviso: "Anote: não é mostrada de novo. As sessões abertas desse gestor foram encerradas.",
  });
}
