import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

// GET /api/admin/backup — exporta os dados do sistema como JSON.
//
// Antes esta rota fazia readFile("dev.db") e devolvia o arquivo SQLite. Isso
// funcionava só na máquina do desenvolvedor: em produção o banco é o Turso
// (remoto, não é arquivo) e o sistema de arquivos da Vercel não tem esse
// arquivo. Ou seja, o botão de backup do painel SEMPRE falhou em produção —
// respondia "não foi possível ler o arquivo do banco". Backup que só funciona
// onde não é necessário é pior que nenhum, porque dá sensação de segurança.
//
// O que isto É: uma cópia legível e portável dos dados de negócio — boa para
// auditoria, migração e para responder "o que havia no dia tal".
//
// O que isto NÃO É: recuperação de desastre. Para isso vale o backup do
// próprio Turso (point-in-time), que copia o banco de verdade.
//
// Segredos ficam de fora de propósito: hash de senha, tokens de sessão e
// chaves de integração não são dado de negócio, e um arquivo na pasta de
// downloads é o lugar errado para eles.
export const maxDuration = 300;

const LIMITE_POR_TABELA = 50_000;

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();

  const take = LIMITE_POR_TABELA;

  const [
    barbershops, users, staff, services, appointments,
    financialTransactions, clients, products, reviews, tips,
    coupons, couponRedemptions, platformInvoices, workingHours,
  ] = await Promise.all([
    prisma.barbershop.findMany({ take }),
    // Sem `password`: hash em arquivo baixado é risco sem contrapartida.
    prisma.user.findMany({
      take,
      select: {
        id: true, name: true, email: true, phone: true, role: true, isActive: true,
        dateOfBirth: true, createdAt: true, lastLoginAt: true, activeBarbershopId: true,
      },
    }),
    prisma.staff.findMany({ take }),
    prisma.service.findMany({ take }),
    prisma.appointment.findMany({ take }),
    prisma.financialTransaction.findMany({ take }),
    prisma.barbershopClient.findMany({ take }),
    prisma.product.findMany({ take }),
    prisma.review.findMany({ take }),
    prisma.tip.findMany({ take }),
    prisma.coupon.findMany({ take }),
    prisma.couponRedemption.findMany({ take }),
    prisma.platformInvoice.findMany({ take }),
    prisma.workingHour.findMany({ take }),
  ]);

  const dados = {
    barbershops, users, staff, services, appointments,
    financialTransactions, clients, products, reviews, tips,
    coupons, couponRedemptions, platformInvoices, workingHours,
  };

  const contagem = Object.fromEntries(
    Object.entries(dados).map(([k, v]) => [k, (v as unknown[]).length]),
  ) as Record<string, number>;

  // Avisa quando bateu no teto: backup silenciosamente truncado é uma mentira
  // que só aparece na hora de restaurar.
  const truncadas = Object.entries(contagem)
    .filter(([, n]) => n >= LIMITE_POR_TABELA)
    .map(([k]) => k);

  const payload = {
    _meta: {
      geradoEm: new Date().toISOString(),
      geradoPor: session.email,
      contagem,
      limitePorTabela: LIMITE_POR_TABELA,
      truncadas,
      aviso:
        "Exportacao de dados de negocio. NAO inclui hash de senha, tokens nem chaves de integracao. Para recuperacao de desastre use o backup do proprio Turso.",
    },
    ...dados,
  };

  await logAdminAction({
    actorId: session.sub,
    action: "system.backup_downloaded",
    targetType: "System",
    targetId: "export-json",
    metadata: { contagem, truncadas },
  });

  const nome = `cortix-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
