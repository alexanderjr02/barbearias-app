import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { emptySlotsThisWeek, churnedClients } from "@/lib/copilot/insights";
import { startOfUtcMonth } from "@/lib/dateRange";
import { oportunidadesDeGestao, fugaAntecipada } from "@/lib/copilot/oportunidades";

// GET /api/marketing/opportunities, os números REAIS que alimentam os cards de
// oportunidade do Marketing (nada de dado inventado): horários vagos da semana,
// clientes sumidos, o nível do Autopilot, quanto o Copiloto já recuperou e o
// que ele fez. É a base do "o app acha a campanha, você só aprova".
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const bid = session.barbershopId;

  const shop = await prisma.barbershop.findUnique({
    where: { id: bid },
    select: { autopilotLevel: true, plan: true, autoConfirm: true, autoBirthday: true, autoWinbackDays: true },
  });

  const [week, churned, agg, feed, ticketAgg, gestao, fugindo] = await Promise.all([
    emptySlotsThisWeek(bid, 6),
    churnedClients(bid, shop?.autoWinbackDays ?? 45, 500),
    prisma.autopilotLog.aggregate({ where: { barbershopId: bid, createdAt: { gte: startOfUtcMonth(new Date()) } }, _sum: { recoveredValue: true }, _count: { _all: true } }),
    prisma.autopilotLog.findMany({ where: { barbershopId: bid }, orderBy: { createdAt: "desc" }, take: 8, select: { action: true, detail: true, createdAt: true } }),
    // Ticket médio real (só concluídos), o valor de CADA horário vago/cliente
    // recuperado, pra mostrar o dinheiro em jogo.
    prisma.appointment.aggregate({ where: { barbershopId: bid, status: "COMPLETED" }, _avg: { totalPrice: true } }),
    // As leituras que exigem julgamento (escala, preco por barbeiro, horario
    // morto) e quem esta indo embora ANTES do prazo fixo de sumido.
    oportunidadesDeGestao(bid),
    fugaAntecipada(bid),
  ]);

  const avgTicket = Math.round((ticketAgg._avg.totalPrice ?? 0) * 100) / 100;

  return NextResponse.json({
    autopilotLevel: shop?.autopilotLevel ?? "suggest",
    plan: shop?.plan ?? "FREE",
    automations: { confirm: !!shop?.autoConfirm, birthday: !!shop?.autoBirthday, winbackDays: shop?.autoWinbackDays ?? null },
    freeSlotsWeek: week.totalFree,
    churnedCount: churned.filter((c) => c.clientId).length,
    recoveredThisMonth: agg._sum.recoveredValue ?? 0,
    actionsThisMonth: agg._count._all,
    avgTicket,
    feed,
    gestao,
    fugindo: fugindo.map((f) => ({ nome: f.nome, ritmo: f.ritmo, atraso: f.atraso, ticket: Math.round(f.ticket * 100) / 100 })),
    fugindoValor: Math.round(fugindo.reduce((s, f) => s + f.ticket, 0)),
  });
}
