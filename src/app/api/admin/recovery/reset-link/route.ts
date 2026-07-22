import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { generatePasswordResetToken } from "@/lib/passwordReset";
import { logAdminAction } from "@/lib/audit";
import { getClientIp } from "@/lib/requestIp";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/admin/recovery/reset-link — a porta dos fundos para quando o
// super admin perde a senha E o e-mail não chega.
//
// Existe porque a recuperação normal depende de duas coisas que podem falhar
// juntas: lembrar a senha e receber e-mail. Quando as duas falham, o dono do
// sistema fica trancado para fora do próprio sistema, sem ninguém acima dele
// para destravar.
//
// O que ela faz é o MÍNIMO: devolve o mesmo link de redefinição que o e-mail
// levaria. Não define senha, não cria sessão, não devolve token de acesso. A
// troca em si continua passando pelo fluxo normal de /reset-password, que já
// é testado — esta rota só substitui o carteiro.
//
// Como ela é protegida:
//   1. Só existe se ADMIN_RECOVERY_SECRET estiver configurado. Sem a variável
//      responde 404, como se a rota não existisse — é o estado normal.
//   2. O segredo tem que ter 24+ caracteres. Segredo curto seria adivinhável
//      justamente na rota que menos pode ser adivinhada.
//   3. Comparação em tempo constante, para o tempo de resposta não vazar
//      quantos caracteres iniciais estavam certos.
//   4. Freio por IP.
//   5. Fica registrada na auditoria, com IP — se alguém usar, aparece.
//
// Depois de recuperar o acesso, APAGUE ADMIN_RECOVERY_SECRET da Vercel. Com a
// variável fora, a rota volta a não existir.
export const maxDuration = 30;

const MIN_SECRET_LENGTH = 24;

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual exige o mesmo tamanho; comparar o tamanho antes já vaza
  // essa informação, mas o tamanho sozinho não abre a porta.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_RECOVERY_SECRET;

  // Estado normal do sistema: a rota não existe.
  if (!expected) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  if (expected.length < MIN_SECRET_LENGTH) {
    return NextResponse.json(
      { error: `ADMIN_RECOVERY_SECRET precisa ter pelo menos ${MIN_SECRET_LENGTH} caracteres.` },
      { status: 500 },
    );
  }

  const ip = getClientIp(request) ?? "desconhecido";
  const limit = rateLimit(`admin-recovery:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json().catch(() => null)) as { secret?: string; email?: string } | null;
  const provided = typeof body?.secret === "string" ? body.secret : "";
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Segredo inválido" }, { status: 401 });
  }

  // Só super admin. Esta rota nunca pode virar um caminho para redefinir a
  // senha de um cliente ou de um gestor qualquer.
  const admins = (await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", isActive: true },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  })) as { id: string; email: string; name: string }[];

  if (admins.length === 0) {
    return NextResponse.json({ error: "Nenhum super admin ativo encontrado" }, { status: 404 });
  }

  const wanted = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const admin = wanted ? admins.find((a) => a.email.toLowerCase() === wanted) : admins[0];
  if (!admin) {
    return NextResponse.json(
      { error: "Esse e-mail não é de um super admin ativo", superAdmins: admins.map((a) => a.email) },
      { status: 404 },
    );
  }

  // Invalida links pendentes antes de emitir o novo — mesma regra do fluxo
  // por e-mail, para não deixar vários links válidos circulando.
  await prisma.passwordResetToken.deleteMany({ where: { userId: admin.id, usedAt: null } });
  const { token, tokenHash, expiresAt } = generatePasswordResetToken();
  await prisma.passwordResetToken.create({ data: { userId: admin.id, tokenHash, expiresAt } });

  const baseUrl = process.env.APP_URL || request.nextUrl.origin;

  await logAdminAction({
    actorId: admin.id,
    action: "admin.recovery.reset_link_issued",
    targetType: "User",
    targetId: admin.id,
    metadata: { ip, email: admin.email },
  });

  return NextResponse.json({
    ok: true,
    email: admin.email,
    resetUrl: `${baseUrl}/reset-password?token=${token}`,
    expiresAt,
    aviso: "Link válido por 1 hora. Depois de trocar a senha, remova ADMIN_RECOVERY_SECRET da Vercel.",
  });
}
