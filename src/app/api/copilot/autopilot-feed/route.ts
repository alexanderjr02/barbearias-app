import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { startOfUtcMonth } from "@/lib/dateRange";
import { desempenhoAutopilot, ROTULO_ACAO } from "@/lib/copilot/conversion";

// GET /api/copilot/autopilot-feed, the "o que o Copiloto fez por você" activity
// feed + the "receita recuperada" number (this month), the ROI proof.
//
// O feed agrupa por ação e dia. Cada disparo grava UMA LINHA POR CLIENTE (é o
// que permite saber quem converteu), e mostrar isso cru viraria vinte linhas
// iguais na tela. Aqui elas voltam a ser uma frase só, agora com quantos
// daqueles clientes agendaram depois.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const startMonth = startOfUtcMonth(new Date());
  const [logs, agg, desempenho] = await Promise.all([
    prisma.autopilotLog.findMany({
      where: { barbershopId: session.barbershopId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { action: true, detail: true, recoveredValue: true, createdAt: true, clientId: true, convertedAt: true },
    }),
    prisma.autopilotLog.aggregate({
      where: { barbershopId: session.barbershopId, createdAt: { gte: startMonth } },
      _sum: { recoveredValue: true },
    }),
    desempenhoAutopilot(session.barbershopId),
  ]);

  type Row = (typeof logs)[number];
  interface Grupo {
    action: string;
    detail: string;
    recoveredValue: number | null;
    createdAt: Date;
    pessoas: number;
    converteram: number;
  }

  const grupos = new Map<string, Grupo>();
  for (const l of logs as Row[]) {
    // Linhas sem clientId são as antigas (agregadas) e as que não pedem nada ao
    // cliente. Cada uma continua sendo uma entrada própria.
    const chave = l.clientId
      ? `${l.action}|${l.createdAt.toISOString().slice(0, 10)}`
      : `solo|${l.action}|${l.createdAt.toISOString()}`;
    const atual = grupos.get(chave);
    if (!atual) {
      grupos.set(chave, {
        action: l.action,
        detail: l.detail,
        recoveredValue: l.recoveredValue,
        createdAt: l.createdAt,
        pessoas: l.clientId ? 1 : 0,
        converteram: l.convertedAt ? 1 : 0,
      });
      continue;
    }
    atual.pessoas += 1;
    if (l.convertedAt) atual.converteram += 1;
    atual.recoveredValue = (atual.recoveredValue ?? 0) + (l.recoveredValue ?? 0);
  }

  const feed = [...grupos.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 25)
    .map((g) => ({
      action: g.action,
      detail:
        g.pessoas > 1
          ? `${ROTULO_ACAO[g.action] ?? "Ação"}: ${g.pessoas} clientes${g.converteram > 0 ? `, ${g.converteram} já agendaram` : ""}.`
          : g.detail,
      recoveredValue: g.recoveredValue,
      createdAt: g.createdAt,
      pessoas: g.pessoas,
      converteram: g.converteram,
    }));

  return NextResponse.json({
    recoveredTotal: agg._sum.recoveredValue ?? 0,
    actionsThisMonth: feed.reduce((s, f) => s + Math.max(1, f.pessoas), 0),
    feed,
    // O que cada tipo de ação converte, para o gestor ver onde vale insistir.
    desempenho: desempenho.map((d) => ({ ...d, label: ROTULO_ACAO[d.action] ?? d.action })),
  });
}
